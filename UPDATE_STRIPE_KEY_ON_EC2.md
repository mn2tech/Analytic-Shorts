# Update Stripe Secret Key on EC2

## Quick Steps

### 1. SSH into your EC2 instance
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
# or
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 2. Navigate to backend directory
```bash
cd /path/to/your/backend
# Common paths:
# ~/NM2-Analytics-Shorts/backend
# /home/ec2-user/backend
# /var/www/backend
```

### 3. Edit the .env file
```bash
nano .env
# or
vi .env
```

### 4. Update the STRIPE_SECRET_KEY line
Find this line:
```env
STRIPE_SECRET_KEY=sk_live_...
```

Replace it with:
```env
STRIPE_SECRET_KEY=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
```

### 5. Save and exit
- **nano**: Press `Ctrl+X`, then `Y`, then `Enter`
- **vi**: Press `Esc`, type `:wq`, then `Enter`

### 6. Restart PM2 to load new environment variable
```bash
pm2 restart all
# or
pm2 restart backend
```

### 7. Verify it's working
```bash
# Check PM2 logs
pm2 logs --lines 20

# Check if the key is loaded (should NOT show the actual key, just confirm it exists)
pm2 env 0 | grep STRIPE
```

## Security Reminder

⚠️ **IMPORTANT:**
- Never commit this key to Git
- Never share this key publicly
- The `.env` file should be in `.gitignore`
- If you accidentally committed it, rotate the key immediately in Stripe Dashboard

## Verify the Key Works

After restarting, try:
1. Go to your app's pricing page
2. Click on a plan to checkout
3. The checkout should work without the "Expired API Key" error

## Troubleshooting

If it still doesn't work:

1. **Check if PM2 loaded the new env:**
   ```bash
   pm2 describe 0 | grep env
   ```

2. **Manually reload environment:**
   ```bash
   pm2 reload all --update-env
   ```

3. **Check backend logs for Stripe errors:**
   ```bash
   pm2 logs backend --err
   ```

4. **Verify the key format:**
   - Should start with `sk_live_` for production
   - Should be exactly as copied from Stripe Dashboard
   - No extra spaces or quotes

