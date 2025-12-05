# How to Set Environment Variables in AWS Amplify

## 🔍 Problem: Environment Variables Not Visible in UI

If you don't see "Environment variables" in the App settings menu, here are alternative ways to set them:

---

## ✅ Solution 1: Use amplify.yml File (Recommended)

### Step 1: Edit amplify.yml

Open `amplify.yml` in your project root and add environment variables:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  environment:
    # Add your environment variables here
    VITE_API_URL: https://your-backend-url.com
    # Add other variables as needed
    # VITE_SUPABASE_URL: https://your-project.supabase.co
    # VITE_SUPABASE_ANON_KEY: your-anon-key
```

### Step 2: Important Notes

- **Replace** `https://your-backend-url.com` with your actual backend URL
- **Do NOT** include trailing slash (`/`)
- **Do NOT** include `/api` in the URL
- Use `https://` (not `http://`)

### Step 3: Commit and Push

```bash
git add amplify.yml
git commit -m "Add VITE_API_URL environment variable"
git push
```

Amplify will automatically detect the change and redeploy.

---

## ✅ Solution 2: Check Branch Settings

Environment variables might be branch-specific:

1. Go to **App settings** → **Branch settings**
2. Click on your branch (usually "main")
3. Look for **Environment variables** or **Variables** section
4. Add `VITE_API_URL` there

---

## ✅ Solution 3: Use AWS CLI

If you have AWS CLI configured:

```bash
# Set environment variable for your app
aws amplify update-app \
  --app-id d2swtp6vppsxta \
  --environment-variables VITE_API_URL=https://your-backend-url.com \
  --region us-east-1
```

---

## ✅ Solution 4: Check Build Settings

Sometimes environment variables are under Build settings:

1. Look for **Build settings** in the left sidebar
2. Or go to your branch → **Build settings**
3. Check for **Environment variables** section

---

## 🎯 Quick Fix: Update amplify.yml

Since you can't see Environment variables in the UI, let's use the `amplify.yml` file:

### Current amplify.yml Structure:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
```

### Updated amplify.yml (Add environment section):

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  environment:
    VITE_API_URL: https://your-backend-url.com
```

**Replace `https://your-backend-url.com` with your actual backend URL!**

---

## 📝 Example: If Using Cloudflare Tunnel

If your backend is accessible via Cloudflare Tunnel:

```yaml
environment:
  VITE_API_URL: https://addresses-population-eat-settled.trycloudflare.com
```

---

## 📝 Example: If Using EC2

If your backend is on EC2:

```yaml
environment:
  VITE_API_URL: http://YOUR-EC2-IP:5000
```

**Note:** For production, you should use HTTPS. Consider setting up Nginx with SSL.

---

## 📝 Example: If Using Railway/Render

If your backend is on Railway or Render:

```yaml
environment:
  VITE_API_URL: https://your-app.railway.app
  # or
  VITE_API_URL: https://your-app.onrender.com
```

---

## ✅ After Updating amplify.yml

1. **Commit the changes:**
   ```bash
   git add amplify.yml
   git commit -m "Add VITE_API_URL environment variable"
   git push
   ```

2. **Amplify will automatically:**
   - Detect the change
   - Start a new build
   - Use the environment variables during build

3. **Verify it worked:**
   - Go to your Amplify app → **Build history**
   - Check the latest build logs
   - Look for your environment variable being used

---

## 🔍 Verify Environment Variable is Set

After deployment, check browser console (F12):

```javascript
console.log(import.meta.env.VITE_API_URL)
```

Should show your backend URL.

---

## 🚨 Common Mistakes

❌ **Wrong:**
```yaml
VITE_API_URL: https://api.example.com/        # Trailing slash
VITE_API_URL: https://api.example.com/api     # Includes /api
VITE_API_URL: http://api.example.com          # http instead of https
```

✅ **Correct:**
```yaml
VITE_API_URL: https://api.example.com
```

---

## 💡 Pro Tip

You can also set multiple environment variables:

```yaml
environment:
  VITE_API_URL: https://your-backend-url.com
  VITE_SUPABASE_URL: https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY: your-anon-key-here
```

---

## 📞 Still Having Issues?

1. Check Amplify build logs for errors
2. Verify the backend URL is accessible: `curl https://your-backend-url.com/api/health`
3. Make sure you committed and pushed the `amplify.yml` changes
4. Wait for the build to complete (can take a few minutes)

---

*This method works even if Environment variables isn't visible in the Amplify UI!*



