# Login Troubleshooting Checklist

If you're getting "Invalid email or password" error, check these:

## ✅ Step 1: Verify Account Exists

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Look for your email address
3. **If user doesn't exist:**
   - You need to sign up first
   - Go to the signup page and create an account

## ✅ Step 2: Check Email Confirmation

1. In Supabase Dashboard → **Authentication** → **Users**
2. Find your user
3. Check if there's a **green checkmark** next to the email (confirmed)
4. **If email is NOT confirmed:**
   - Check your email inbox (and spam folder) for a confirmation email
   - Click the confirmation link
   - Try logging in again

## ✅ Step 3: Verify Credentials

**Common mistakes:**
- Extra spaces in email (e.g., " user@example.com " instead of "user@example.com")
- Wrong email address
- Wrong password
- Caps lock is on
- Typo in password

**Try:**
1. Copy-paste your email to avoid typos
2. Make sure password is correct (try showing/hiding it)
3. Check if Caps Lock is on

## ✅ Step 4: Check Browser Console

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Try logging in
4. Look for:
   - `Attempting sign in for: [your-email]`
   - `Sign in error details:` - This shows the actual error from Supabase
   - `Raw error message:` - The exact error message

**Share these logs** if you need help!

## ✅ Step 5: Check Supabase Settings

1. Go to **Supabase Dashboard** → **Authentication** → **Settings**
2. Check:
   - **"Enable email confirmations"** - If ON, you must confirm email
   - **"Site URL"** - Should match your app URL
   - **"Redirect URLs"** - Should include your app URL

## ✅ Step 6: Test with Supabase Dashboard

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Find your user
3. Click the **three dots** (⋮) next to the user
4. Click **"Reset password"** or **"Send magic link"**
5. This will help verify:
   - The account exists
   - The email is correct
   - Email delivery is working

## ✅ Step 7: Disable Email Confirmation (For Testing)

If you want to test without email confirmation:

1. Go to **Supabase Dashboard** → **Authentication** → **Settings**
2. Find **"Enable email confirmations"**
3. Toggle it **OFF**
4. Save changes
5. Try logging in again

**Note:** This is only for development/testing. Re-enable it for production!

## ✅ Step 8: Reset Password

If you're sure the email is correct but password might be wrong:

1. Click **"Forgot password?"** on the login page
2. Enter your email
3. Check your inbox for password reset link
4. Reset your password
5. Try logging in with the new password

## ✅ Step 9: Check Environment Variables

Make sure your `.env.local` file has:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**To verify:**
1. Open browser console
2. Run: `console.log(import.meta.env.VITE_SUPABASE_URL)`
3. Should show your Supabase URL (not undefined)

## ✅ Step 10: Create New Test Account

If nothing works, try creating a fresh test account:

1. Use a different email address
2. Sign up with a simple password (at least 6 characters)
3. If email confirmation is required, confirm the email
4. Try logging in with the new account

This helps determine if:
- The issue is with your specific account
- Or a general configuration problem

## Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "Invalid login credentials" | Wrong email/password OR email not confirmed | Check credentials, confirm email |
| "Email not confirmed" | Need to click confirmation link | Check email inbox |
| "User not found" | Account doesn't exist | Sign up first |
| "Too many requests" | Rate limited | Wait a few minutes |
| "Network error" | Connection issue | Check internet, verify Supabase URL |

## Still Not Working?

**Share these details:**
1. ✅ Does the user exist in Supabase Dashboard?
2. ✅ Is the email confirmed?
3. ✅ What does browser console show? (Copy the error logs)
4. ✅ What's the exact error message on the page?
5. ✅ Have you tried resetting the password?




