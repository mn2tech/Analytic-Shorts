#!/usr/bin/env python3
"""
Generate a sample SAS file from project sample-data.csv.

pyreadstat can write SAS XPORT (.xpt) but NOT native .sas7bdat.
This script writes backend/sample-data/sample.xpt (SAS XPORT format).
Your app supports both .xpt and .sas7bdat for upload; use this .xpt for a quick sample.

For a native .sas7bdat file: use SAS or another tool, or place your own
backend/sample-data/sample.sas7bdat in that folder.

Requires: pip install pyreadstat pandas

Run from project root: python backend/scripts/generate_sample_sas7bdat.py
"""
import os
import sys

try:
    import pandas as pd
    import pyreadstat
except ImportError:
    print("Install dependencies: pip install pyreadstat pandas", file=sys.stderr)
    sys.exit(1)

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
csv_paths = [
    os.path.join(project_root, "sample-data.csv"),
    os.path.join(project_root, "backend", "..", "sample-data.csv"),
]
csv_path = next((p for p in csv_paths if os.path.isfile(p)), None)
if not csv_path:
    print("sample-data.csv not found in project root", file=sys.stderr)
    sys.exit(1)

out_dir = os.path.join(project_root, "backend", "sample-data")
os.makedirs(out_dir, exist_ok=True)

df = pd.read_csv(csv_path)
for col in ["Sales", "Units"]:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)

# pyreadstat can write XPORT (.xpt) but not .sas7bdat
out_xpt = os.path.join(out_dir, "sample.xpt")
pyreadstat.write_xport(df, out_xpt)
print(f"Wrote {out_xpt} ({len(df)} rows)")
print("Note: pyreadstat cannot write .sas7bdat. For native .sas7bdat, add your own file as backend/sample-data/sample.sas7bdat")
