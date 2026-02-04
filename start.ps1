# Simple Startup Script for NM2-Analytics-Shorts
# Just run: .\start.ps1

Write-Host "🚀 Starting NM2-Analytics-Shorts..." -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "   Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Node.js found: $(node --version)" -ForegroundColor Green

# Check if npm is installed
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm is not installed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ npm found: $(npm --version)" -ForegroundColor Green
Write-Host ""

# Install frontend dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✅ Frontend dependencies already installed" -ForegroundColor Green
}

# Install backend dependencies if needed
if (-not (Test-Path "backend\node_modules")) {
    Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
        exit 1
    }
    Set-Location ..
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✅ Backend dependencies already installed" -ForegroundColor Green
}

# Create backend .env if it doesn't exist
if (-not (Test-Path "backend\.env")) {
    Write-Host "📝 Creating backend/.env file..." -ForegroundColor Yellow
    @"
PORT=5000

# Supabase Configuration (Optional - for saving dashboards)
# Get these from: https://supabase.com/dashboard → Settings → API
# SUPABASE_URL=your_supabase_project_url
# SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Frontend URL
FRONTEND_URL=http://localhost:3000

# CORS Allowed Origins
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# OpenAI API Key (Optional - for AI insights)
# OPENAI_API_KEY=your_openai_api_key_here
"@ | Out-File -FilePath "backend\.env" -Encoding utf8
    Write-Host "✅ Created backend/.env file" -ForegroundColor Green
    Write-Host "   Note: Supabase is optional. Example datasets will work without it!" -ForegroundColor Cyan
} else {
    Write-Host "✅ Backend .env file exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎯 Starting both frontend and backend..." -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000 (or 5173)" -ForegroundColor White
Write-Host "   Backend:  http://localhost:5000" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

# Start both servers
npm run dev:all







