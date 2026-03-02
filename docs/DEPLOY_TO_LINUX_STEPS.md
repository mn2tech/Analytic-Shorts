# Deploy Changes to Linux Production Server

Use these steps whenever you have changes to push from your local copy to the Linux server.

---

## Overview

- **Local (Windows)**: Test changes
- **Linux server**: Production backend (e.g. `api.nm2tech-sas.com`)
- **Amplify**: Production frontend (builds from git)

---

## Step 1: Test locally

On your Windows machine:

```powershell
cd c:\Users\kolaw\Projects\NM2-Analytics-Shorts

# Start backend and frontend
npm run dev:all
```

Test your changes in the browser. Fix any issues before deploying.

---

## Step 2: Commit and push to git

```powershell
cd c:\Users\kolaw\Projects\NM2-Analytics-Shorts

# See what changed
git status

# Add files
git add .
# Or add specific files: git add src/pages/Messages.jsx backend/...

# Commit with a short message
git commit -m "Brief description of changes"

# Push to main
git push origin main
```

This triggers an Amplify build for the frontend. No extra steps needed for the frontend.

---

## Step 3: Pull on the Linux server

SSH into your server and pull the latest code:

```bash
# SSH (replace with your user and host)
ssh raj@your-server-ip

# Go to the project (adjust path if yours is different)
cd ~/Analytic-Shorts
# or: cd /path/to/NM2-Analytics-Shorts

# Pull latest
git pull origin main
```

---

## Step 4: Update backend dependencies (if needed)

If `backend/package.json` or `backend/package-lock.json` changed:

```bash
cd ~/Analytic-Shorts/backend
npm install
```

If unchanged, skip this step.

---

## Step 5: Restart the backend

```bash
cd ~/Analytic-Shorts

# Option A: If using a plain process
pkill -f "node.*server.js" || true
sleep 2
nohup npm run server > backend.log 2>&1 &

# Option B: If using PM2
pm2 restart all

# Option C: If using the helper script
cd backend
./start-or-check.sh --check-only   # see if running
pkill -f "node.*server.js" || true
./start-or-check.sh
```

---

## Step 6: Verify backend is up

```bash
curl -s http://localhost:5000/api/health
```

You should see JSON like `{"status":"ok",...}`.

Or from outside:

```bash
curl -s https://api.nm2tech-sas.com/api/health
```

---

## Step 7: Verify frontend (Amplify)

After `git push`, Amplify builds and deploys the frontend. Wait a few minutes, then open:

https://analytics-shorts.nm2tech-sas.com

(or your production frontend URL).

---

## Checklist (every change)

| Step | Command / action |
|------|------------------|
| 1 | Test locally: `npm run dev:all` |
| 2 | `git add .` → `git commit -m "..."` → `git push origin main` |
| 3 | SSH to server → `cd ~/Analytic-Shorts` → `git pull origin main` |
| 4 | If `backend/package*.json` changed: `cd backend && npm install` |
| 5 | Restart backend: `pkill -f "node.*server.js"` then `nohup npm run server &` |
| 6 | `curl http://localhost:5000/api/health` |
| 7 | Open production frontend and test |

---

## Backend .env on Linux

The server needs its own `backend/.env` with production values. Do not commit `.env`. If you add new env vars locally (e.g. `RESEND_API_KEY`), add them on the server:

```bash
nano ~/Analytic-Shorts/backend/.env
# Add or edit variables, save, restart backend
```

---

## Troubleshooting

- **Port 5000 already in use (EADDRINUSE)**:
  ```bash
  # Find and kill the process
  lsof -i :5000          # note the PID
  kill <PID>
  # Or in one step:
  pkill -f "node.*server.js"
  # Or force-free the port:
  fuser -k 5000/tcp
  sleep 2
  npm run server
  ```
- **Backend won't start**: Check `backend.log` or run `npm run server` in the foreground to see errors.
- **Changes not visible**: Ensure you pulled on the server and restarted the backend; frontend changes are deployed via Amplify after `git push`.
- **Different repo path**: If the project is in a different folder on the server, replace `~/Analytic-Shorts` with your actual path.
