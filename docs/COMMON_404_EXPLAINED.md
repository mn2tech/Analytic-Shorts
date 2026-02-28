# Common 404 errors

## 1. `GET /api/uploads/thumbnails/thumb-xxxxx.png` → 404

**Meaning:** A post or dashboard thumbnail image is missing on the backend.

**Cause:** The backend serves thumbnails from `backend/uploads/thumbnails/`. The 404 means that file (e.g. `thumb-1772118863791-oqdwe17l.png`) is not there. Common reasons:
- The thumbnail was never generated for that post/dashboard.
- The backend was restarted and the `uploads` folder was cleared or is different.
- The app is pointing to an old or wrong thumbnail path (e.g. after a deploy, old URLs may no longer exist).

**Fix:**
- Ensure the backend process has write access to `backend/uploads/thumbnails/` and that the folder exists (the server creates it on startup if missing).
- Re-save or re-publish the post/dashboard to regenerate the thumbnail, if your app supports it.
- In development, ensure the frontend proxies `/api` to the backend (e.g. Vite proxy to `http://localhost:5000`) so thumbnail requests hit the same server that has the files.

**Note:** Requests go to the same origin as the app (e.g. `localhost:3000`). With Vite’s proxy, `/api` is forwarded to the backend (e.g. `localhost:5000`). If you see 404 on the thumbnail URL, the request is reaching the backend but the specific file is missing on disk.
