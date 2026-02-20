# NM2 Analytics Shorts – Run Commands

## Prerequisites

- **Node.js** (v18+ recommended)
- **npm** (comes with Node)

## One-time setup

```powershell
cd c:\Users\kolaw\Projects\NM2-Analytics-Shorts
npm install
```

## Run the app

You need **two processes**: backend (API) and frontend (Vite).

### Option A: Two terminals (recommended on Windows)

**Terminal 1 – Backend (API):**
```powershell
cd c:\Users\kolaw\Projects\NM2-Analytics-Shorts
npm run server
```
- Backend runs at **http://localhost:5000** (or the port in `backend/server.js`).

**Terminal 2 – Frontend (Vite):**
```powershell
cd c:\Users\kolaw\Projects\NM2-Analytics-Shorts
npm run dev
```
- Frontend runs at **http://localhost:5173** (Vite default). Open this URL in the browser.

### Option B: Single command (both together)

```powershell
cd c:\Users\kolaw\Projects\NM2-Analytics-Shorts
npm run dev:all
```
- Starts both backend and frontend with `concurrently`. If this fails on your machine, use Option A.

---

## Other useful commands

| Command | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (frontend only) |
| `npm run server` | Start Node backend (API) only |
| `npm run build` | Production build of frontend (`dist/`) |
| `npm run preview` | Serve production build locally (run after `npm run build`) |
| `npm run dev:all` | Start both frontend and backend |

---

## Git push (run locally with your credentials)

After the commit already made, push from your machine:

```powershell
cd c:\Users\kolaw\Projects\NM2-Analytics-Shorts
git push origin main
```

If you use SSH or a different remote/branch, adjust the command (e.g. `git push origin your-branch`).
