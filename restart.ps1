# Quick Restart Script
# Run this: .\restart.ps1

Write-Host "🛑 Stopping servers..." -ForegroundColor Yellow

# Stop Frontend (Port 3000)
$frontend = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($frontend) {
    Stop-Process -Id $frontend -Force
    Write-Host "✅ Stopped frontend (port 3000)" -ForegroundColor Green
}

# Stop Backend (Port 5000)
$backend = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($backend) {
    Stop-Process -Id $backend -Force
    Write-Host "✅ Stopped backend (port 5000)" -ForegroundColor Green
}

Write-Host ""
Write-Host "⏳ Waiting 2 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "🚀 Starting servers..." -ForegroundColor Blue
Write-Host ""
Write-Host "Run these commands in separate terminals:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Terminal 1 - Backend:" -ForegroundColor White
Write-Host "  cd backend" -ForegroundColor Gray
Write-Host "  npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "Terminal 2 - Frontend:" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor Gray
Write-Host ""




