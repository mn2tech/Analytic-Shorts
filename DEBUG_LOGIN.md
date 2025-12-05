# Debug Login Issue - Step by Step

## Step 1: Check Browser Console

1. Open your app in the browser
2. Press **F12** to open DevTools
3. Go to the **Console** tab
4. Try to log in
5. Look for these logs:
   - `Attempting sign in for: [your-email]`
   - `Sign in error details: { ... }`
   - `Raw error message: ...`

**Copy and share these logs** - they show the exact error from Supabase.

## Step 2: Verify Account in Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **Users**
4. Look for your email address
5. Check:
   - ✅ Does the user exist?
   - ✅ Is there a green checkmark next to the email? (confirmed)
   - ✅ What's the "Last Sign In" time?

## Step 3: Check Email Confirmation Setting

1. In Supabase Dashboard → **Authentication** → **Settings**
2. Scroll to **"Email Auth"** section
3. Check **"Enable email confirmations"**:
   - **If ON:** You MUST confirm your email before logging in
   - **If OFF:** You can log in immediately after signup

## Step 4: Test with Direct Supabase Call

Open browser console (F12) and run:

```javascript
// First, get your Supabase credentials from .env.local
// Then run this in the console:

const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')

// Replace with your actual values from .env.local
const supabaseUrl = 'YOUR_SUPABASE_URL_HERE'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY_HERE'

const supabase = createClient(supabaseUrl, supabaseKey)

// Try to sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'your-email@example.com',
  password: 'your-password'
})

console.log('Result:', data)
console.log('Error:', error)
```

This will show you the exact response from Supabase.

## Step 5: Check Environment Variables

In browser console, run:

```javascript
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set (hidden)' : 'MISSING!')
```

Both should be set. If either is `undefined`, your `.env.local` file is not being loaded.

## Step 6: Verify Credentials

**Common issues:**
- Email has extra spaces: ` user@example.com ` instead of `user@example.com`
- Wrong email address
- Wrong password (case-sensitive!)
- Caps Lock is on

**Try:**
1. Copy-paste your email to avoid typos
2. Show/hide password to verify it's correct
3. Check Caps Lock

## Step 7: Reset Password (If Needed)

If you're not sure about the password:

1. Click **"Forgot password?"** on the login page
2. Enter your email
3. Check your inbox for password reset link
4. Reset password
5. Try logging in with new password

## Step 8: Disable Email Confirmation (For Testing)

**Only for development/testing:**

1. Supabase Dashboard → **Authentication** → **Settings**
2. Find **"Enable email confirmations"**
3. Toggle it **OFF**
4. Save
5. Try logging in again

**Remember to re-enable for production!**

## Step 9: Check Network Tab

1. Open DevTools (F12)
2. Go to **Network** tab
3. Try to log in
4. Look for request to `*.supabase.co/auth/v1/token`
5. Click on it and check:
   - **Status:** Should be 200 (success) or 400 (error)
   - **Response:** Shows the actual error from Supabase

## Step 10: Create Fresh Test Account

If nothing works:

1. Sign up with a **new email address** you haven't used before
2. Use a simple password (at least 6 characters)
3. If email confirmation is required, confirm the email
4. Try logging in with the new account

This helps determine if:
- The issue is with your specific account
- Or a general configuration problem

## What to Share for Help

If you need help, share:

1. ✅ **Browser console logs** (especially `Sign in error details:`)
2. ✅ **Does user exist in Supabase Dashboard?** (Yes/No)
3. ✅ **Is email confirmed?** (Yes/No - check for green checkmark)
4. ✅ **What's the exact error message?** (Copy from the page)
5. ✅ **Is email confirmation enabled?** (Check Supabase Settings)
6. ✅ **Environment variables set?** (Check console output)

## Quick Test Script

I've created `test-login.html` - you can open it in a browser to test Supabase login directly without the React app. This helps isolate if the issue is with the app or Supabase configuration.




