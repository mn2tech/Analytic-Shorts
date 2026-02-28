# .sas7bdat support (optional)

Analytics Shorts can read native SAS datasets (`.sas7bdat`) when the optional `sas7bdat` package builds successfully. That package uses a native addon (`fs-ext`) which requires **C++ build tools** on your machine.

## If `npm install` fails with node-gyp / Visual Studio errors

You have Visual Studio or Build Tools installed, but node-gyp needs the **C++ toolset**:

1. Open **Visual Studio Installer** (or install it from https://visualstudio.microsoft.com/downloads/).
2. For your existing Visual Studio or "Build Tools for Visual Studio":
   - Click **Modify**.
   - Under **Workloads**, enable **"Desktop development with C++"**.
   - Install (this adds the MSVC compiler and Windows SDK).
3. Close any open terminals, then in the backend folder run:
   ```bash
   cd backend
   npm install
   ```
   Optional dependencies (including `sas7bdat`) will be installed and `fs-ext` will be built.

## If you prefer not to install build tools

- Use **SAS XPORT (`.xpt`)** or **CSV** instead of `.sas7bdat` for uploads; the app supports those without any native build.
- The app runs normally either way; only `.sas7bdat` uploads require this optional native module.
