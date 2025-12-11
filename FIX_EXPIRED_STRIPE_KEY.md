# Fix Expired Stripe API Key

## Problem
You're seeing an error: "Expired API Key provided" when trying to checkout.

## Solution

### Step 1: Generate New Stripe Secret Key

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Make sure you're in **Live mode** (toggle in top right)
3. Click **"Create secret key"** or **"Reveal test key"** if you need to see existing keys
4. If creating new:
   - Click **"Add secret key"**
   - Give it a name (e.g., "Analytics Shorts Production")
   - Copy the key (starts with `sk_live_...`)
   - **Important:** You can only see the full key once!

### Step 2: Update Backend Environment Variable

**On your EC2 server:**

1. SSH into your EC2 instance
2. Navigate to your backend directory:
   ```bash
   cd /path/to/your/backend
   ```
3. Edit the `.env` file:
   ```bash
   nano .env
   # or
   vi .env
   ```
4. Update the `STRIPE_SECRET_KEY` line:
   ```env
   STRIPE_SECRET_KEY=sk_live_YOUR_NEW_KEY_HERE
   ```
5. Save the file (Ctrl+X, then Y, then Enter for nano)

### Step 3: Restart Backend Server

Restart PM2 to load the new environment variable:

```bash
pm2 restart all
# or if you have a specific process name:
pm2 restart backend
```

### Step 4: Verify

1. Check PM2 logs to ensure the server started:
   ```bash
   pm2 logs
   ```
2. Look for any Stripe-related warnings
3. Try the checkout process again

## Alternative: Check Current Key Status

If you're not sure which key is expired:

1. Go to [Stripe Dashboard → API Keys](https://dashboard.stripe.com/apikeys)
2. Check the status of all your keys
3. Look for any keys marked as "Expired" or with a warning icon
4. Either:
   - Reactivate the key (if possible)
   - Or create a new one and update your backend

## Important Notes

- **Never commit** your Stripe secret key to Git
- The key should only be in `backend/.env` (which should be in `.gitignore`)
- Make sure you're using **Live mode** keys (`sk_live_...`) for production
- Test mode keys (`sk_test_...`) won't work with live mode products

## Troubleshooting

If the error persists after updating:

1. **Verify the key format:**
   - Live mode: `sk_live_...`
   - Test mode: `sk_test_...`

2. **Check backend logs:**
   ```bash
   pm2 logs backend --lines 50
   ```
   Look for Stripe initialization errors

3. **Verify environment variable is loaded:**
   ```bash
   pm2 env <process-id>
   ```
   Check if `STRIPE_SECRET_KEY` is listed

4. **Test the key manually:**
   You can test if the key works by making a simple API call (but be careful not to expose it)

## Need Help?

If you continue to have issues:
1. Check the backend console logs for detailed error messages
2. Verify the key is correctly set in the `.env` file
3. Ensure PM2 has been restarted after updating the key
4. Check that you're using the correct mode (Live vs Test)

