# Backend API - NM2TECH Analytics Shorts

Express.js backend API for file upload, data processing, and AI insights.

## Quick Start

```bash
cd backend
npm install
npm start
```

Server runs on `http://localhost:5000`

## After clone / pull (e.g. on Linux)

If the frontend shows **"Cannot load dataset"** or data never loads:

1. **Start the backend** on the same machine that serves (or will serve) the frontend:
   ```bash
   cd backend
   npm install
   node server.js
   ```
   You should see: `[server] POST /api/ai/dashboard-spec registered` and `Server running on http://localhost:5000`.

2. **Start the frontend** from the project root (so the dev server can proxy `/api` to the backend):
   ```bash
   npm run dev
   ```
   Open the app at the URL shown (e.g. `http://localhost:3000`). Dataset dropdown and AI Visual Builder will work when the backend is reachable.

3. If the frontend is on a **different host** (e.g. you open the app at `http://<server-ip>:3000`), the backend must be running on that server and the firewall must allow port 5000. For a production build, set `VITE_API_URL=http://<backend-host>:5000` when building so the app calls the correct API.

### If you see "Cannot POST /api/ai/dashboard-spec"

The 404 means the request is not handled by this backend. On the **same machine** where the app runs, check:

1. **Free port 5000 and start this backend only:**
   ```bash
   fuser -k 5000/tcp    # Linux: kill whatever uses 5000
   cd backend && node server.js
   ```
   You must see in the terminal: `[server] POST /api/ai/dashboard-spec registered`.

2. **Confirm this backend is the one on 5000** (run in another terminal on the same machine):
   ```bash
   curl -s http://localhost:5000/api/ai/dashboard-spec
   ```
   - If you get `{"error":"Method not allowed","hint":"Use POST..."}` → this backend is running; the browser request is likely going somewhere else (wrong URL or no proxy).
   - If you get `{"error":"Route not found","message":"Cannot GET ..."}` → the process on 5000 is **not** this backend (old or different app). Stop it, then start again from step 1.

3. **Frontend must use this backend:**
   - Dev: run `npm run dev` from the **project root** so Vite proxies `/api` to `http://localhost:5000`. Open the app at the URL Vite shows (e.g. `http://localhost:3000` or `http://0.0.0.0:3000`).
   - If you serve a built app (e.g. nginx), configure the server to proxy `/api` to `http://localhost:5000`, or build with `VITE_API_URL=http://your-backend-url:5000`.

## Environment Variables

Create a `.env` file in the `backend` directory:

```env
PORT=5000
OPENAI_API_KEY=sk-your-key-here  # Optional, for AI insights
```

## API Endpoints

- `POST /api/upload` - Upload CSV/Excel file
- `GET /api/example/medical` - Get medical sample data
- `GET /api/example/sales` - Get sales sample data
- `GET /api/example/attendance` - Get attendance sample data
- `GET /api/example/donations` - Get donations sample data
- `POST /api/insights` - Generate AI insights
- `GET /api/health` - Health check

## Deployment Options

### Option 1: AWS Lambda + API Gateway (Recommended)

See `AMPLIFY_SETUP.md` for detailed instructions.

### Option 2: AWS Elastic Beanstalk

1. Install EB CLI: `pip install awsebcli`
2. Initialize: `eb init`
3. Create environment: `eb create`
4. Deploy: `eb deploy`

### Option 3: Railway / Render / Heroku

These platforms can host Node.js apps easily:

**Railway:**
1. Connect GitHub repo
2. Set root directory to `backend`
3. Add environment variables
4. Deploy

**Render:**
1. Create new Web Service
2. Connect GitHub repo
3. Set root directory to `backend`
4. Build command: `npm install`
5. Start command: `npm start`

### Option 4: EC2 Instance

1. Launch EC2 instance (Ubuntu)
2. Install Node.js: `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs`
3. Clone repository
4. Install dependencies: `cd backend && npm install`
5. Use PM2 to run: `npm install -g pm2 && pm2 start server.js`
6. Configure security group to allow HTTP/HTTPS

## CORS Configuration

Update `backend/server.js` to allow your Amplify domain:

```javascript
app.use(cors({
  origin: [
    'https://your-app.amplifyapp.com',
    'http://localhost:3000'
  ],
  credentials: true
}))
```

## PDF Export (Puppeteer)

The Agency Branded PDF export (`POST /api/studio/pdf`) uses Puppeteer to render HTML to PDF. In **containers or serverless** environments:

- Use Chromium flags already set in the route: `--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`, `--disable-gpu`.
- If running in Docker, you may need to install Chromium in the image (e.g. use `puppeteer` with `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false` and install deps, or use `puppeteer-core` with a custom `executablePath` to a pre-installed Chromium).
- On serverless (e.g. Lambda), use a layer or package that provides a headless Chromium binary and set `executablePath` in `puppeteer.launch()`.

## After Deployment

1. Get your backend API URL (e.g., `https://api.example.com`)
2. In AWS Amplify Console → App settings → Environment variables
3. Add: `VITE_API_URL` = your backend URL
4. Redeploy the frontend





