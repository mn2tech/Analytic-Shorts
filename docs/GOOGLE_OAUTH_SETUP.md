# Google Sign-In Setup

To enable "Sign in with Google" on the Login and Signup pages, configure Google OAuth in Supabase and Google Cloud Console.

## 1. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project or select an existing one.
3. Go to **APIs & Services** → **Credentials**.
4. Click **Create Credentials** → **OAuth client ID**.
5. If prompted, configure the OAuth consent screen:
   - Choose **External** (or Internal for workspace-only).
   - Fill in App name, User support email, Developer contact.
   - Add your domain to **Authorized domains** if using a custom domain.
6. For Application type, select **Web application**.
7. Add **Authorized JavaScript origins**:
   - `http://localhost:5173` (Vite dev)
   - `http://localhost:3000` (if different)
   - Your production URL (e.g. `https://your-app.amplifyapp.com`)
8. Add **Authorized redirect URIs**:
   - `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
   - Get `<YOUR_SUPABASE_PROJECT_REF>` from Supabase Dashboard → Settings → API.
9. Click **Create** and copy the **Client ID** and **Client Secret**.

## 2. Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. Go to **Authentication** → **Providers**.
3. Find **Google** and enable it.
4. Paste the **Client ID** and **Client Secret** from Google Cloud Console.
5. Save.

## 3. Redirect URLs (Supabase)

1. In Supabase, go to **Authentication** → **URL Configuration**.
2. Add your app URLs to **Redirect URLs**:
   - `http://localhost:5173/feed`
   - `http://localhost:5173/**`
   - Your production URL (e.g. `https://your-app.amplifyapp.com/feed`).
3. Set **Site URL** to your main app URL (e.g. `https://your-app.amplifyapp.com` for production).

## 4. Test

1. Restart the frontend if it's running.
2. Go to the Login or Signup page.
3. Click **Sign in with Google** (or **Sign up with Google**).
4. You should be redirected to Google, then back to your app after signing in.

## Troubleshooting

- **Redirect URI mismatch**: Ensure the exact callback URL (`https://xxx.supabase.co/auth/v1/callback`) is in Google Cloud Console **Authorized redirect URIs**.
- **Origin not allowed**: Add your app origin to **Authorized JavaScript origins** in Google Cloud Console.
- **Provider not enabled**: Confirm Google is enabled in Supabase → Authentication → Providers.

## Still not working? Checklist

Go through these in order. The most common missed step is **Supabase Redirect URLs**:

### 1. Supabase → Authentication → URL Configuration

| Setting       | For local dev                | For production                    |
|---------------|------------------------------|-----------------------------------|
| **Site URL**  | `http://localhost:5173`      | `https://your-app.amplifyapp.com` |
| **Redirect URLs** | Add both of these:       | Add your production URL + /feed   |
|               | `http://localhost:5173/feed` | `https://your-app.amplifyapp.com/feed` |
|               | `http://localhost:5173/**`   | `https://your-app.amplifyapp.com/**`   |

Click **Save** after adding.

### 2. Google OAuth client – Authorized JavaScript origins

Use the OAuth client that has the Supabase callback in its redirect URIs. In that client, ensure **Authorized JavaScript origins** includes:

- `http://localhost:5173` (for local dev)
- Your production URL (e.g. `https://your-app.amplifyapp.com`)

If this section is empty, Google may block the OAuth request.

### 3. Correct OAuth client in Supabase

Use the **same** OAuth client whose redirect URIs include:

- `https://ybpzhhzadvarebdclykl.supabase.co/auth/v1/callback`

Copy its **Client ID** and **Client Secret** into Supabase → Authentication → Providers → Google. Do **not** use credentials from a different OAuth client (e.g. one only for Streamlit).

### 4. Save in Supabase

After entering Client ID and Secret, click **Save**. If you don’t save, the provider change won’t apply.

### 5. Hard refresh

- Clear browser cache or use Ctrl+Shift+R (Cmd+Shift+R on Mac).
- Restart the dev server (`npm run dev`).
