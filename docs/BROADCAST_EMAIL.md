# Send Email to Users (Broadcast & Reminders)

Admins can send emails via these endpoints.

## Reminder: Users with no dashboards

**Endpoint:** `POST /api/analytics/reminder-no-dashboards`

Sends a one-click reminder to users who have **not created any dashboard**. The email tells them they can create 3 dashboards for free and post on the Feed.

**Headers:** `Authorization: Bearer <admin_jwt_token>`

**No body required** — the message is pre-written.

**Example (PowerShell):**
```powershell
$token = "YOUR_ADMIN_JWT"
Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/analytics/reminder-no-dashboards" `
  -Headers @{ Authorization = "Bearer $token" }
```

**Response:** `{ total, sent, failed, message }`

---

## Broadcast: All users

Admins can send a custom email to all registered users via the broadcast endpoint.

## Requirements

1. **Admin access** – Your email must be in `ADMIN_EMAILS` (backend `.env`).
2. **Resend configured** – `RESEND_API_KEY` and optionally `NOTIFICATION_EMAIL_FROM` (see `PRODUCTION_MESSAGES_EMAIL.md`).

## API

**Endpoint:** `POST /api/analytics/broadcast-email`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "subject": "Your email subject",
  "html": "<p>HTML content here</p><p>Links: <a href=\"https://yoursite.com\">Visit site</a></p>"
}
```

Or use plain text (it will be wrapped in paragraphs):
```json
{
  "subject": "Announcement",
  "body": "Hello!\n\nWe have a new feature. Check it out."
}
```

**Response:**
```json
{
  "total": 42,
  "sent": 42,
  "failed": 0,
  "message": "Email sent to 42 of 42 users"
}
```

## Using cURL (PowerShell)

1. Sign in to get a JWT (or copy from browser DevTools → Application → Local Storage / session).
2. Run:

```powershell
$token = "YOUR_JWT_TOKEN"
$body = @{
  subject = "New feature announcement"
  body = "We just launched the Community Feed. Visit the home page to see it!"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/analytics/broadcast-email" `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body $body
```

## Using from browser console (logged in as admin)

```javascript
const session = JSON.parse(localStorage.getItem('sb-...-auth-token'))  // key varies by Supabase project
const token = session?.current_session?.access_token
const res = await fetch('http://localhost:5000/api/analytics/broadcast-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ subject: 'Hello everyone', body: 'This is a test.' })
})
const data = await res.json()
console.log(data)
```

## Notes

- Emails are sent one by one with a small delay to avoid rate limits.
- Resend free tier has sending limits; verify your plan.
- For production, use your verified domain in `NOTIFICATION_EMAIL_FROM`.
