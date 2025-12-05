# Supabase Authentication Setup Instructions

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Click "Start your project" or "Sign up"
3. Sign up with GitHub, Google, or email
4. Click "New Project"
5. Fill in:
   - **Name**: `nm2tech-analytics` (or any name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free (for now)
6. Click "Create new project"
7. Wait 2-3 minutes for project to initialize

## Step 2: Get Your Credentials

1. Once project is ready, go to **Settings** → **API**
2. You'll see:
   - **Project URL**: Something like `https://xxxxx.supabase.co`
   - **anon public key**: A long string starting with `eyJ...`

## Step 3: Create .env File

In your project root (`C:\Users\kolaw\Projects\NM2-Analytics-Shorts`), create a file named `.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important:**
- Replace `your-project-id` with your actual project ID
- Replace `your-anon-key-here` with your actual anon key
- Do NOT commit `.env` to git (it's already in .gitignore)

## Step 4: Configure Email Settings (Optional but Recommended)

1. In Supabase Dashboard, go to **Authentication** → **Settings**
2. Under **Email Auth**, you can:
   - Enable email confirmations (recommended for production)
   - Customize email templates
   - Set up SMTP (for custom email sending)

For testing, you can disable email confirmations:
- Go to **Authentication** → **Settings** → **Email Auth**
- Toggle off "Enable email confirmations"

## Step 5: Test the Setup

1. **Start your dev server:**
   ```powershell
   npm run dev
   ```

2. **Open your browser:**
   - Go to `http://localhost:3000` (or whatever port Vite uses)
   - You should see the home page

3. **Test Sign Up:**
   - Click "Sign Up" in the navbar
   - Fill in the form
   - Submit
   - Check your email (if email confirmation is enabled)
   - Or you'll be redirected to dashboard (if email confirmation is disabled)

4. **Test Sign In:**
   - Click "Sign In"
   - Use the credentials you just created
   - You should be redirected to dashboard

## Step 6: Verify Authentication Works

1. **Check browser console** (F12) - should be no errors
2. **Try accessing `/dashboard`** - should require login
3. **Sign out** - should redirect to login page
4. **Check Supabase Dashboard:**
   - Go to **Authentication** → **Users**
   - You should see your test user

## Troubleshooting

### "Supabase credentials not found" warning
- Make sure `.env` file exists in project root
- Check that variable names start with `VITE_`
- Restart your dev server after creating `.env`

### "Invalid API key" error
- Double-check your anon key in `.env`
- Make sure there are no extra spaces or quotes
- Get fresh keys from Supabase Dashboard

### Email confirmation not working
- Check spam folder
- Disable email confirmation in Supabase settings for testing
- Check Supabase logs: **Logs** → **Auth Logs**

### Can't sign in after signup
- If email confirmation is enabled, check your email
- Check Supabase Dashboard → Authentication → Users to see user status
- Try resetting password if needed

## Next Steps

Once authentication is working:

1. ✅ Test signup/login flow
2. ✅ Verify protected routes work
3. ✅ Test logout functionality
4. 📝 Set up database tables (see SAAS_TRANSFORMATION_GUIDE.md)
5. 📝 Add user profile management
6. 📝 Implement subscription system

## Security Notes

- The `anon` key is safe to use in frontend (it's public)
- Never expose your `service_role` key in frontend code
- Row Level Security (RLS) will be set up when we add database tables
- Always use HTTPS in production

---

**Need help?** Check:
- Supabase Docs: https://supabase.com/docs/guides/auth
- Supabase Discord: https://discord.supabase.com




