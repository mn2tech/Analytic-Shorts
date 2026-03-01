# Production "Network Error" – Works Locally, Fails in Prod

When the app works locally but shows **Network Error** in production, the frontend is calling the API but not getting a response. Fix these in order.

## 1. Frontend must know the API URL (VITE_API_URL)

The production build bakes in the API URL at **build time**. If `VITE_API_URL` is missing or wrong, the app calls the wrong host (or relative URLs that fail on a different domain).

**In AWS Amplify:**

1. Open your app → **App settings** → **Environment variables**.
2. Ensure **VITE_API_URL** is set to your production backend URL, e.g.  
   `https://api.nm2tech-sas.com`  
   - No trailing slash.  
   - No `/api` path (the app adds that).
3. **Redeploy** the frontend (e.g. trigger a new build) after changing it. Old builds keep the old URL.

**Check in the browser:** Open your production app → DevTools → Console. You should see logs like:
- `API Base URL: https://api.nm2tech-sas.com`
- `VITE_API_URL env var: https://api.nm2tech-sas.com`

If you see `Not set` or empty, the build did not get `VITE_API_URL`. Add it in Amplify and rebuild.

---

## 2. Backend must allow your frontend origin (CORS)

The backend runs in production with `NODE_ENV=production`. It then uses **ALLOWED_ORIGINS** for CORS.

- If **ALLOWED_ORIGINS** is **not set** in the backend environment, the server allows all origins (`*`). No CORS change needed.
- If **ALLOWED_ORIGINS** **is set** (e.g. on Railway, Render, EC2), it must include your **exact** frontend origin, for example:
  - `https://main.xxxxxx.amplifyapp.com`
  - or your custom domain: `https://yourapp.com`

**Backend .env (production):** Either leave `ALLOWED_ORIGINS` unset, or set it to a comma‑separated list including the frontend URL:

```env
ALLOWED_ORIGINS=https://main.xxxxxx.amplifyapp.com,https://yourapp.com
```

Restart the backend after changing env vars.

---

## 3. Backend must be reachable

Confirm the API is up and responding:

- Open: `https://api.nm2tech-sas.com/api/health`  
  You should get JSON (e.g. `{"status":"ok"}`), not a timeout or 5xx.

If that URL fails, the problem is backend deployment or DNS, not the frontend.

---

## 4. Quick checklist

| Check | Action |
|-------|--------|
| VITE_API_URL in Amplify | Set to `https://api.nm2tech-sas.com`, no trailing slash. |
| Rebuild after changing env | Trigger a new Amplify build. |
| Backend CORS | Leave ALLOWED_ORIGINS unset, or include your Amplify/custom frontend URL. |
| Backend running | GET `https://api.nm2tech-sas.com/api/health` returns 200. |
| Same URL in code | `amplify.yml` has the same `VITE_API_URL` as Amplify Console (or rely on Console). |

After fixing, hard-refresh the production site (Ctrl+Shift+R) or clear cache so the browser uses the latest JS.
