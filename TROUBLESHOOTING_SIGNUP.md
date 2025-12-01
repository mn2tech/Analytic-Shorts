# Troubleshooting Signup Issues

## Common Issues and Solutions

### 1. Check Supabase Environment Variables

Make sure your `.env.local` file (in the root directory) contains:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**To verify:**
1. Open browser console (F12)
2. Check for warnings about missing Supabase credentials
3. The app should log: `Signup response: { hasUser: ..., hasSession: ..., ... }`

### 2. Check Supabase Email Confirmation Settings

In Supabase Dashboard:
- Go to **Authentication** → **Settings**
- Check **"Enable email confirmations"** setting

**If email confirmation is ENABLED:**
- After signup, user will be `null` until they confirm their email
- This is **normal behavior** - the account is created successfully
- User must check their email and click the confirmation link
- After confirmation, they can sign in

**If email confirmation is DISABLED:**
- User should be automatically signed in after signup
- They should be redirected to `/dashboard` immediately

### 3. Check Browser Console for Errors

Open browser console (F12) and look for:
- `Signup error:` - Shows the actual error from Supabase
- `Signup response:` - Shows what Supabase returned
- Any network errors (CORS, connection issues)

### 4. Common Error Messages

**"Failed to create account. Please try again."**
- Check Supabase credentials in `.env.local`
- Verify Supabase project is active
- Check browser console for detailed error

**"User already registered"**
- Email is already in use
- Try signing in instead, or use a different email

**"Password should be at least 6 characters"**
- Supabase requires minimum 6 characters
- The form should validate this, but double-check

**"Invalid email"**
- Check email format
- Make sure it's a valid email address

### 5. Test Signup Flow

1. Open browser console (F12)
2. Go to signup page
3. Fill in the form and submit
4. Watch console for:
   - `Signup response:` log
   - Any error messages
5. Check what happens:
   - If email confirmation is required: You should see success message and redirect to login
   - If email confirmation is disabled: You should be redirected to dashboard immediately

### 6. Verify Supabase Project Setup

1. Go to Supabase Dashboard
2. Check **Authentication** → **Users** - you should see the new user
3. If user exists but can't sign in:
   - Check if email is confirmed (green checkmark)
   - If not confirmed, check spam folder for confirmation email

### 7. Database Triggers

Make sure you've run the database schema:
- `database/schema.sql` should be executed in Supabase SQL Editor
- This creates the user profile and subscription automatically

If triggers aren't working:
- Check Supabase **Database** → **Functions** for `create_shorts_user_profile` and `create_default_shorts_subscription`
- Check **Database** → **Triggers** for the auth user triggers

## Quick Debug Steps

1. **Check environment variables:**
   ```bash
   # In browser console:
   console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
   console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing')
   ```

2. **Test Supabase connection:**
   - Try signing up with a test email
   - Check browser console for detailed logs
   - Check Supabase Dashboard → Authentication → Users

3. **Check network tab:**
   - Open browser DevTools → Network tab
   - Try signing up
   - Look for requests to `*.supabase.co`
   - Check if they return 200 (success) or error codes

## Still Not Working?

1. Share the exact error message from browser console
2. Share the `Signup response:` log output
3. Check if user appears in Supabase Dashboard → Authentication → Users
4. Verify `.env.local` file is in the root directory (not in `src/` or `backend/`)


