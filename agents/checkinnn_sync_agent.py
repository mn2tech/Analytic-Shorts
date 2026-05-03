"""
Auto-sync wrapper for existing CheckInn manual import logic.

This module intentionally DOES NOT implement import mappings/parsing logic.
It watches for .dta file changes, de-duplicates by file hash, and delegates
to an existing import function that you already have in your codebase.
"""

import argparse
import hashlib
import importlib
import inspect
import logging
import os
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv
from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

import servicemanager
import win32event
import win32service
import win32serviceutil


LOG = logging.getLogger("checkinn-sync-agent")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class AgentConfig:
    watch_dir: Path
    watch_pattern: str
    sync_runs_table: str
    import_module: str
    import_function: str
    supabase_module: str
    supabase_attr: str
    service_name: str
    poll_debounce_seconds: float

    @classmethod
    def from_env(cls) -> "AgentConfig":
        load_dotenv()
        return cls(
            watch_dir=Path(os.getenv("CHECKINN_WATCH_DIR", r"C:\CheckInn\Data")).resolve(),
            watch_pattern=os.getenv("CHECKINN_WATCH_PATTERN", "*.dta").lower(),
            sync_runs_table=os.getenv("CHECKINN_SYNC_RUNS_TABLE", "innsoft_sync_runs"),
            import_module=os.getenv("CHECKINN_IMPORT_MODULE", "agents.checkinnn_manual_import_adapter").strip(),
            import_function=os.getenv("CHECKINN_IMPORT_FUNCTION", "import_checkinn_dta").strip(),
            supabase_module=os.getenv("CHECKINN_SUPABASE_MODULE", "").strip(),
            supabase_attr=os.getenv("CHECKINN_SUPABASE_ATTR", "supabase").strip(),
            service_name=os.getenv("CHECKINN_SERVICE_NAME", "CheckInnSyncAgent"),
            poll_debounce_seconds=float(os.getenv("CHECKINN_DEBOUNCE_SECONDS", "2.5")),
        )

    def validate(self) -> None:
        if not self.import_module:
            raise ValueError("CHECKINN_IMPORT_MODULE is required.")
        if not self.import_function:
            raise ValueError("CHECKINN_IMPORT_FUNCTION is required.")
        if not self.supabase_module:
            raise ValueError("CHECKINN_SUPABASE_MODULE is required.")


def resolve_attr_path(root: Any, attr_path: str) -> Any:
    current = root
    for part in attr_path.split("."):
        current = getattr(current, part)
    return current


def load_existing_import_callable(config: AgentConfig):
    module = importlib.import_module(config.import_module)
    return resolve_attr_path(module, config.import_function)


def load_existing_supabase_client(config: AgentConfig):
    module = importlib.import_module(config.supabase_module)
    return resolve_attr_path(module, config.supabase_attr)


def compute_file_hash(file_path: Path) -> str:
    sha256 = hashlib.sha256()
    with file_path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


def safe_err_text(err: Exception) -> str:
    return f"{type(err).__name__}: {err}"


def upsert_run_row(supabase: Any, table: str, row: dict) -> None:
    # Match existing manual import error-handling pattern by surfacing exceptions.
    supabase.table(table).upsert(row).execute()


def insert_run_row(supabase: Any, table: str, row: dict) -> None:
    supabase.table(table).insert(row).execute()


def duplicate_hash_exists(supabase: Any, table: str, file_hash: str) -> bool:
    result = (
        supabase.table(table)
        .select("id")
        .eq("file_hash", file_hash)
        .eq("status", "success")
        .limit(1)
        .execute()
    )
    rows = getattr(result, "data", None) or []
    return bool(rows)


def call_existing_import(import_callable: Any, file_path: Path) -> Any:
    signature = inspect.signature(import_callable)
    params = signature.parameters

    if len(params) == 0:
        return import_callable()

    candidate_kwargs = {
        "file_path": str(file_path),
        "path": str(file_path),
        "dta_path": str(file_path),
        "source_path": str(file_path),
        "file": str(file_path),
    }
    kwargs = {k: v for k, v in candidate_kwargs.items() if k in params}
    if kwargs:
        return import_callable(**kwargs)

    # Fallback: first positional parameter receives changed file path.
    return import_callable(str(file_path))


class CheckInnSyncRunner:
    def __init__(self, config: AgentConfig):
        self.config = config
        self.supabase = load_existing_supabase_client(config)
        self.import_callable = load_existing_import_callable(config)
        self._last_seen: dict[str, float] = {}
        self._lock = threading.Lock()

    def should_handle(self, file_path: Path) -> bool:
        if not file_path.is_file():
            return False
        if file_path.suffix.lower() != ".dta":
            return False
        key = str(file_path).lower()
        now = time.time()
        with self._lock:
            last = self._last_seen.get(key, 0.0)
            if now - last < self.config.poll_debounce_seconds:
                return False
            self._last_seen[key] = now
        return True

    def run_once(self, file_path: Path, trigger: str) -> None:
        if not self.should_handle(file_path):
            return

        run_id = f"{int(time.time() * 1000)}-{file_path.name}"
        started_at = utc_now_iso()
        base_row = {
            "run_id": run_id,
            "file_name": file_path.name,
            "file_path": str(file_path),
            "trigger": trigger,
            "started_at": started_at,
            "status": "started",
        }

        try:
            insert_run_row(self.supabase, self.config.sync_runs_table, base_row)
        except Exception as err:
            LOG.error("Failed to record sync start for %s: %s", file_path, safe_err_text(err))

        try:
            file_hash = compute_file_hash(file_path)
        except Exception as err:
            LOG.exception("Unable to hash file %s", file_path)
            fail_row = {
                **base_row,
                "status": "error",
                "error_message": safe_err_text(err),
                "finished_at": utc_now_iso(),
            }
            try:
                upsert_run_row(self.supabase, self.config.sync_runs_table, fail_row)
            except Exception:
                LOG.exception("Failed to record hash error run row.")
            return

        if duplicate_hash_exists(self.supabase, self.config.sync_runs_table, file_hash):
            LOG.info("Duplicate hash detected; skipping import for %s", file_path)
            duplicate_row = {
                **base_row,
                "file_hash": file_hash,
                "status": "skipped_duplicate",
                "finished_at": utc_now_iso(),
            }
            try:
                upsert_run_row(self.supabase, self.config.sync_runs_table, duplicate_row)
            except Exception:
                LOG.exception("Failed to record duplicate skip run row.")
            return

        try:
            result = call_existing_import(self.import_callable, file_path)
            success_row = {
                **base_row,
                "file_hash": file_hash,
                "status": "success",
                "result": str(result)[:4000] if result is not None else None,
                "finished_at": utc_now_iso(),
            }
            upsert_run_row(self.supabase, self.config.sync_runs_table, success_row)
            LOG.info("Sync succeeded for %s", file_path)
        except Exception as err:
            LOG.exception("Sync failed for %s", file_path)
            error_row = {
                **base_row,
                "file_hash": file_hash,
                "status": "error",
                "error_message": safe_err_text(err),
                "finished_at": utc_now_iso(),
            }
            try:
                upsert_run_row(self.supabase, self.config.sync_runs_table, error_row)
            except Exception:
                LOG.exception("Failed to record sync error run row.")


class DtaWatcherHandler(FileSystemEventHandler):
    def __init__(self, runner: CheckInnSyncRunner):
        super().__init__()
        self.runner = runner

    def _handle(self, event: FileSystemEvent, trigger: str) -> None:
        if event.is_directory:
            return
        target_path = Path(event.dest_path if trigger == "moved" else event.src_path)
        if target_path.suffix.lower() != ".dta":
            return
        self.runner.run_once(target_path, trigger=trigger)

    def on_created(self, event: FileSystemEvent) -> None:
        self._handle(event, "created")

    def on_modified(self, event: FileSystemEvent) -> None:
        self._handle(event, "modified")

    def on_moved(self, event: FileSystemEvent) -> None:
        self._handle(event, "moved")


def run_foreground(config: AgentConfig) -> None:
    config.validate()
    LOG.info("Starting CheckInn sync watcher in foreground.")
    LOG.info("Watching directory: %s", config.watch_dir)
    config.watch_dir.mkdir(parents=True, exist_ok=True)

    runner = CheckInnSyncRunner(config)
    observer = Observer()
    observer.schedule(DtaWatcherHandler(runner), str(config.watch_dir), recursive=False)
    observer.start()
    try:
        while True:
            time.sleep(1.0)
    except KeyboardInterrupt:
        LOG.info("Stopping watcher (keyboard interrupt).")
    finally:
        observer.stop()
        observer.join()


class CheckInnSyncWindowsService(win32serviceutil.ServiceFramework):
    _svc_name_ = "CheckInnSyncAgent"
    _svc_display_name_ = "CheckInn Auto Sync Agent"
    _svc_description_ = "Watches CheckInn data directory and runs existing DTA importer."

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.observer: Optional[Observer] = None

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.stop_event)
        if self.observer:
            self.observer.stop()

    def SvcDoRun(self):
        try:
            config = AgentConfig.from_env()
            config.validate()
            self.__class__._svc_name_ = config.service_name
            self.__class__._svc_display_name_ = f"{config.service_name} Service"

            config.watch_dir.mkdir(parents=True, exist_ok=True)
            runner = CheckInnSyncRunner(config)
            self.observer = Observer()
            self.observer.schedule(DtaWatcherHandler(runner), str(config.watch_dir), recursive=False)
            self.observer.start()

            servicemanager.LogInfoMsg(f"{config.service_name} started; watching {config.watch_dir}")
            win32event.WaitForSingleObject(self.stop_event, win32event.INFINITE)
        except Exception as err:
            servicemanager.LogErrorMsg(f"CheckInn service fatal error: {safe_err_text(err)}")
        finally:
            if self.observer:
                self.observer.join(timeout=10)
            servicemanager.LogInfoMsg("CheckInn sync service stopped.")


def configure_logging() -> None:
    level = os.getenv("CHECKINN_LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=getattr(logging, level, logging.INFO),
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


def parse_args():
    parser = argparse.ArgumentParser(description="CheckInn .dta auto-sync service wrapper.")
    parser.add_argument(
        "--run-foreground",
        action="store_true",
        help="Run watcher in foreground for local validation (non-service mode).",
    )
    parser.add_argument(
        "--sync-file",
        help="Sync a single .dta file once, then exit.",
    )
    return parser.parse_known_args()


def main():
    configure_logging()
    args, passthrough = parse_args()
    config = AgentConfig.from_env()

    if args.run_foreground:
        run_foreground(config)
        return

    if args.sync_file:
        config.validate()
        runner = CheckInnSyncRunner(config)
        runner.run_once(Path(args.sync_file).resolve(), trigger="manual")
        return

    # Default path: pywin32 service command handling.
    win32serviceutil.HandleCommandLine(CheckInnSyncWindowsService, argv=[""] + passthrough)


if __name__ == "__main__":
    main()
