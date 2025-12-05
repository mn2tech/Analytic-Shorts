# PowerShell script to update backend/.env with production Stripe secret key

$envFile = "backend\.env"
$newSecretKey = "sk_live_YOUR_SECRET_KEY_HERE"

# Check if .env file exists
if (Test-Path $envFile) {
    Write-Host "✅ Found backend/.env file" -ForegroundColor Green
    
    # Read the file
    $content = Get-Content $envFile
    
    # Check if STRIPE_SECRET_KEY exists
    $hasStripeKey = $content | Select-String -Pattern "^STRIPE_SECRET_KEY="
    
    if ($hasStripeKey) {
        # Replace existing STRIPE_SECRET_KEY line
        $content = $content | ForEach-Object {
            if ($_ -match "^STRIPE_SECRET_KEY=") {
                "STRIPE_SECRET_KEY=$newSecretKey"
            } else {
                $_
            }
        }
        Write-Host "✅ Updated existing STRIPE_SECRET_KEY" -ForegroundColor Green
    } else {
        # Add STRIPE_SECRET_KEY if it doesn't exist
        $content += "STRIPE_SECRET_KEY=$newSecretKey"
        Write-Host "✅ Added STRIPE_SECRET_KEY" -ForegroundColor Green
    }
    
    # Write back to file
    $content | Set-Content $envFile
    Write-Host "✅ Successfully updated backend/.env" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  Don't forget to:" -ForegroundColor Yellow
    Write-Host "   1. Add STRIPE_WEBHOOK_SECRET (get from Stripe Dashboard → Webhooks)" -ForegroundColor Yellow
    Write-Host "   2. Update FRONTEND_URL with your production URL" -ForegroundColor Yellow
    Write-Host "   3. Restart your backend server" -ForegroundColor Yellow
} else {
    Write-Host "❌ backend/.env file not found!" -ForegroundColor Red
    Write-Host "Creating new file..." -ForegroundColor Yellow
    
    # Create new .env file with the secret key
    $newContent = @"
PORT=5000

# Production Stripe Secret Key
STRIPE_SECRET_KEY=$newSecretKey

# Production Webhook Secret (get from Stripe Dashboard → Webhooks)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_PRODUCTION_WEBHOOK_SECRET

# Production Frontend URL (update with your actual frontend URL)
FRONTEND_URL=https://your-production-frontend-url.com

# Supabase Configuration (keep your existing values)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# CORS Allowed Origins
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
"@
    
    $newContent | Set-Content $envFile
    Write-Host "✅ Created backend/.env file" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  Don't forget to update:" -ForegroundColor Yellow
    Write-Host "   - SUPABASE_URL" -ForegroundColor Yellow
    Write-Host "   - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Yellow
    Write-Host "   - STRIPE_WEBHOOK_SECRET" -ForegroundColor Yellow
    Write-Host "   - FRONTEND_URL" -ForegroundColor Yellow
}

