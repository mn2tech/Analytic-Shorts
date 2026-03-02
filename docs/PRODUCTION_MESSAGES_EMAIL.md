# Production Messages & Email Notifications

Messages and email notifications can fail in production for different reasons. Fix in this order.

---

## 1. Messages not working at all

If the Messages page loads but you can't send or receive, or you get **Network Error**:

**Frontend → Backend connectivity**

- The frontend must reach the backend API. See `docs/PRODUCTION_NETWORK_ERROR.md`.
- Ensure **VITE_API_URL** is set in Amplify to your backend URL (e.g. `https://api.nm2tech-sas.com`).
- Trigger a new Amplify build after changing env vars.

**Backend**

- Backend must be running and reachable at the API URL.
- Run `curl -s https://api.nm2tech-sas.com/api/health` – you should get JSON.

**Database**

- Ensure the `direct_messages` migration has been run in Supabase:
  - Supabase Dashboard → SQL Editor
  - Run `supabase/migrations/20250220210000_direct_messages.sql` if not already applied.

**CORS**

- If ALLOWED_ORIGINS is set on the backend, it must include your frontend origin (e.g. `https://main.xxxxx.amplifyapp.com`).

---

## 2. Messages work, but email notifications don't arrive

Email notifications (new message, like, save, follow, comment) use **Resend**. The production backend needs these env vars.

### Required: RESEND_API_KEY

Without this, emails are never sent (the code skips and logs in production).

**Setup:**

1. Go to [resend.com](https://resend.com) and create an account.
2. Get your API key (Dashboard → API Keys).
3. Add it to your **production backend** environment (e.g. on EC2, Railway, Render):
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxx
   ```
4. Restart the backend after adding.

### Required: FRONTEND_URL

Used for links in emails (e.g. "View messages", "View post"). If wrong or missing, links point to localhost and are unusable.

**On your production backend:**
```env
FRONTEND_URL=https://main.xxxxxx.amplifyapp.com
# or your custom domain:
FRONTEND_URL=https://analytics-shorts.yourdomain.com
```

### Required for real users: verified domain (NOTIFICATION_EMAIL_FROM)

The default `onboarding@resend.dev` can only send **to the email you signed up with**. For other recipients you must verify a domain.

**Setup:**

1. In Resend Dashboard → Domains, add your domain (e.g. `nm2tech-sas.com`).
2. Add the DNS records Resend provides.
3. Set on the backend:
   ```env
   NOTIFICATION_EMAIL_FROM=Analytics Shorts <notifications@nm2tech-sas.com>
   ```

If the domain is not verified, Resend will reject sends and you may see errors in backend logs.

---

## 3. Checklist

| Item | Where | Value |
|------|-------|-------|
| VITE_API_URL | Amplify env vars | `https://api.nm2tech-sas.com` |
| Backend running | EC2 / server | `npm run server` or PM2/systemd |
| direct_messages table | Supabase | Run migration if missing |
| RESEND_API_KEY | Backend .env | `re_xxxx` from Resend |
| FRONTEND_URL | Backend .env | Your production frontend URL |
| NOTIFICATION_EMAIL_FROM | Backend .env | Use verified domain address |
| Domain verified | Resend Dashboard | DNS records added |

---

## 4. Verify email is being attempted

Check the backend logs when a message is sent. You should see either:

- Success: no error
- Skip: `[email] message notification not sent` or `[email] (no RESEND_API_KEY)` – env var missing
- Resend error: `[email] Resend error: 403` or similar – API key invalid or domain not verified

Fix based on what you see in the logs.
