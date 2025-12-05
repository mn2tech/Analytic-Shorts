# Quick script to restart the frontend server
# Run this in PowerShell: .\restart-frontend.ps1

Write-Host "🔄 Restarting Frontend Server..." -ForegroundColor Blue

# Kill any process on port 3000
Write-Host "Stopping any process on port 3000..." -ForegroundColor Yellow
$process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process) {
    Stop-Process -Id $process -Force
    Write-Host "✅ Stopped process $process" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "No process found on port 3000" -ForegroundColor Yellow
}

# Start the frontend server
Write-Host "Starting frontend server..." -ForegroundColor Yellow
Write-Host "Run this command in a new terminal:" -ForegroundColor Cyan
Write-Host "npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Then open: http://localhost:3000" -ForegroundColor Green




