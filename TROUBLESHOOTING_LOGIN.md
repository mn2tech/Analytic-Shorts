# Troubleshooting Login Issues

## Common Issues and Solutions

### 1. "Invalid email or password" Error

**Possible causes:**
- Wrong email or password
- Email not confirmed (if email confirmation is required)
- Account doesn't exist

**Solutions:**
- Double-check your email and password
- If you just signed up, check your email for a confirmation link
- Try resetting your password if you forgot it
- Verify the account exists in Supabase Dashboard → Authentication → Users

### 2. "Please confirm your email address" Error

**Cause:** Supabase requires email confirmation, and you haven't confirmed yet.

**Solution:**
1. Check your email inbox (and spam folder) for a confirmation email from Supabase
2. Click the confirmation link in the email
3. Try logging in again

**To disable email confirmation (for development):**
1. Go to Supabase Dashboard
2. Navigate to **Authentication** → **Settings**
3. Find **"Enable email confirmations"**
4. Toggle it OFF
5. Save changes

### 3. Login Succeeds But Redirects Back to Login

**Possible causes:**
- Auth state not updating properly
- ProtectedRoute checking user before state updates
- Session not being set correctly

**Solutions:**
1. Check browser console for errors
2. Check if session exists: Open browser console and run:
   ```javascript
   // Check current session
   const { data: { session } } = await supabase.auth.getSession()
   console.log('Session:', session)
   ```
3. Check if user state is updating in AuthContext
4. Try refreshing the page after login

### 4. Network Errors

**Error messages:**
- "Network error. Please check your connection and try again."
- "Failed to fetch"
- CORS errors

**Solutions:**
1. Check your internet connection
2. Verify Supabase credentials in `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. Check browser console for detailed error messages
4. Verify Supabase project is active in dashboard

### 5. "Too many login attempts" Error

**Cause:** Rate limiting from Supabase

**Solution:**
- Wait a few minutes before trying again
- This is a security feature to prevent brute force attacks

### 6. User Exists But Can't Login

**Check in Supabase Dashboard:**
1. Go to **Authentication** → **Users**
2. Find your user
3. Check:
   - Is email confirmed? (green checkmark)
   - Is user active? (not banned)
   - What's the last sign in time?

**If email not confirmed:**
- Resend confirmation email from Supabase Dashboard
- Or disable email confirmation for development

**If user is banned:**
- Unban the user in Supabase Dashboard

### 7. Session Not Persisting

**Symptoms:**
- Login works, but after page refresh, user is logged out
- Session disappears

**Solutions:**
1. Check browser localStorage:
   - Open DevTools → Application → Local Storage
   - Look for `sb-<project-id>-auth-token`
   - If missing, session isn't being saved

2. Check if cookies are blocked:
   - Some browsers/extensions block cookies
   - Try in incognito mode or different browser

3. Verify Supabase client configuration:
   - Check `src/lib/supabase.js`
   - Make sure it's using the correct URL and key

## Debugging Steps

### Step 1: Check Browser Console

Open browser console (F12) and look for:
- `Sign in error:` - Shows the actual error from Supabase
- `Sign in successful:` - Shows what Supabase returned
- Any network errors

### Step 2: Verify Supabase Configuration

In browser console, run:
```javascript
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing')
```

### Step 3: Test Supabase Connection

In browser console, run:
```javascript
import { supabase } from './lib/supabase'

// Try to get current session
const { data: { session }, error } = await supabase.auth.getSession()
console.log('Session:', session)
console.log('Error:', error)
```

### Step 4: Check Network Requests

1. Open DevTools → Network tab
2. Try logging in
3. Look for requests to `*.supabase.co/auth/v1/token`
4. Check:
   - Status code (should be 200)
   - Response body (should contain user and session)
   - Request payload (email and password)

### Step 5: Verify User in Supabase

1. Go to Supabase Dashboard
2. Navigate to **Authentication** → **Users**
3. Find your user
4. Check:
   - Email is correct
   - Email is confirmed (if required)
   - User is active
   - Last sign in time

## Common Error Messages

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "Invalid email or password" | Wrong credentials or email not confirmed | Check credentials, confirm email |
| "Email not confirmed" | Email confirmation required | Check email for confirmation link |
| "User not found" | Account doesn't exist | Sign up first |
| "Too many requests" | Rate limiting | Wait a few minutes |
| "Network error" | Connection issue | Check internet, verify Supabase URL |
| "Failed to fetch" | CORS or network issue | Check Supabase configuration |

## Still Not Working?

1. **Share the exact error message** from the login page
2. **Share browser console logs** (especially `Sign in error:` and `Sign in successful:`)
3. **Check Supabase Dashboard:**
   - Is the user created?
   - Is email confirmed?
   - Is user active?
4. **Verify environment variables** in `.env.local`
5. **Test in different browser** or incognito mode

## Quick Test

To quickly test if Supabase is working:

```javascript
// In browser console after opening the app
const { supabase } = await import('./lib/supabase')

// Try signing in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'your-email@example.com',
  password: 'your-password'
})

console.log('Result:', data)
console.log('Error:', error)
```

If this works in console but not in the app, the issue is in the React code.
If this doesn't work in console, the issue is with Supabase configuration.


