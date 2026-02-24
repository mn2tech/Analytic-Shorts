# NM2 Analytics Shorts – Run Commands

## Prerequisites

- **Node.js** (v18+ recommended)
- **npm** (comes with Node)

---

## Linux / macOS (bash)

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
