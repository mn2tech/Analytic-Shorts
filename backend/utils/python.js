/**
 * Resolve Python command for spawning workers.
 * On Windows, `py -3` (Python Launcher) ensures Python 3 when `python` may be missing from PATH.
 */
function getPythonCommand() {
  if (process.env.PYTHON_CMD) return process.env.PYTHON_CMD
  return process.platform === 'win32' ? 'py' : 'python3'
}

/** Extra args before script path (e.g. py -3 script.py). */
function getPythonPrefixArgs() {
  if (process.env.PYTHON_CMD) return []
  return process.platform === 'win32' ? ['-3'] : []
}

module.exports = { getPythonCommand, getPythonPrefixArgs }
