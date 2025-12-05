# 🔄 Restart Commands

## Quick Restart (Both Servers)

### Option 1: Stop and Restart Manually

**Stop Current Servers:**
- Press `Ctrl + C` in both terminal windows (backend and frontend)

**Restart Backend:**
```powershell
cd backend
npm start
```

**Restart Frontend (in a NEW terminal):**
```powershell
npm run dev
```

### Option 2: Restart Both Together

**Stop both servers** (Ctrl + C in both terminals), then:

**Terminal 1:**
```powershell
npm run dev:all
```

This starts both backend and frontend together.

## Individual Restart Commands

### Backend Only
```powershell
cd backend
npm start
```

Or with auto-reload (development mode):
```powershell
cd backend
npm run dev
```

### Frontend Only
```powershell
npm run dev
```

## Force Stop (If Servers Won't Stop)

### Stop Process on Port 3000 (Frontend)
```powershell
$process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process) { Stop-Process -Id $process -Force }
```

### Stop Process on Port 5000 (Backend)
```powershell
$process = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process) { Stop-Process -Id $process -Force }
```

## Complete Restart (Clean)

1. **Stop all processes:**
```powershell
# Stop frontend
$process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process) { Stop-Process -Id $process -Force }

# Stop backend
$process = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process) { Stop-Process -Id $process -Force }
```

2. **Wait 2 seconds:**
```powershell
Start-Sleep -Seconds 2
```

3. **Start Backend:**
```powershell
cd backend
npm start
```

4. **Start Frontend (new terminal):**
```powershell
npm run dev
```

## Quick Copy-Paste Commands

### Restart Backend
```powershell
cd backend; npm start
```

### Restart Frontend
```powershell
npm run dev
```

### Restart Both (Separate Terminals)
```powershell
# Terminal 1
cd backend; npm start

# Terminal 2 (new terminal)
npm run dev
```




