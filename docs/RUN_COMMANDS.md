# NM2 Analytics Shorts – Run Commands

## Prerequisites

- **Node.js** (v18+ recommended)
- **npm** (comes with Node)

---

## Linux / macOS (bash)

### Check if backend is running

From the project root or any directory:

```bash
# Option 1: See if something is listening on port 5000
ss -tlnp | grep 5000
# or
lsof -i :5000

# Option 2: Hit the health endpoint (works from same machine or another)
curl -s http://localhost:5000/api/health
# If the backend is up you get JSON like {"status":"ok",...}
```

If `ss`/`lsof` show nothing on 5000, or `curl` fails (connection refused), the backend is not running.

### Start the backend (Linux)

From **project root**:

```bash
cd /path/to/NM2-Analytics-Shorts
npm run server
```

Or from the **backend** directory (uses backend’s own `node server.js`):

```bash
cd /path/to/NM2-Analytics-Shorts/backend
npm install   # if you haven’t already
node server.js
```

To run in the background (e.g. on a server):

```bash
cd /path/to/NM2-Analytics-Shorts
nohup npm run server > backend.log 2>&1 &
# Optional: check it’s up
sleep 2 && curl -s http://localhost:5000/api/health
```

To stop a backend running in the background, find the process and kill it:

```bash
lsof -i :5000   # note the PID
kill <PID>
# or
pkill -f "node backend/server.js"
```

**Helper script (Linux/macOS):** From the repo you can run:

```bash
cd /path/to/NM2-Analytics-Shorts/backend
chmod +x start-or-check.sh
./start-or-check.sh          # start backend if not running (foreground)
./start-or-check.sh --check-only   # only check and exit 0/1
```

### One-time setup

```bash
cd /path/to/NM2-Analytics-Shorts
npm install
```

### Run the app (two terminals)

**Terminal 1 – Backend:**
```bash
cd /path/to/NM2-Analytics-Shorts
npm run server
```
→ Backend at **http://localhost:5000**

**Terminal 2 – Frontend:**
```bash
cd /path/to/NM2-Analytics-Shorts
npm run dev
```
→ Frontend at **http://localhost:5173**

### Or run both in one terminal

```bash
cd /path/to/NM2-Analytics-Shorts
npm run dev:all
```

### Git push (Linux)

```bash
cd /path/to/NM2-Analytics-Shorts
git push origin main
```

---

## Windows (PowerShell)

### One-time setup

```powershell
cd c:\Users\kolaw\Projects\NM2-Analytics-Shorts
npm install
```

### Run the app (two terminals)

**Terminal 1 – Backend:**
```powershell
cd c:\Users\kolaw\Projects\NM2-Analytics-Shorts
npm run server
```
→ Backend at **http://localhost:5000**

**Terminal 2 – Frontend:**
```powershell
cd c:\Users\kolaw\Projects\NM2-Analytics-Shorts
npm run dev
```
→ Frontend at **http://localhost:5173**

### Or run both in one terminal

```powershell
cd c:\Users\kolaw\Projects\NM2-Analytics-Shorts
npm run dev:all
```

### Git push (Windows)

```powershell
cd c:\Users\kolaw\Projects\NM2-Analytics-Shorts
git push origin main
```

---

## All platforms – npm scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (frontend only) |
| `npm run server` | Start Node backend (API) only |
| `npm run build` | Production build of frontend (`dist/`) |
| `npm run preview` | Serve production build locally (run after `npm run build`) |
| `npm run dev:all` | Start both frontend and backend |

Replace `/path/to/NM2-Analytics-Shorts` with your actual project path (e.g. `~/Projects/NM2-Analytics-Shorts` on Linux).
