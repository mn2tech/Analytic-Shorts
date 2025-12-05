# Backend API - NM2TECH Analytics Shorts

Express.js backend API for file upload, data processing, and AI insights.

## Quick Start

```bash
cd backend
npm install
npm start
```

Server runs on `http://localhost:5000`

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

## After Deployment

1. Get your backend API URL (e.g., `https://api.example.com`)
2. In AWS Amplify Console → App settings → Environment variables
3. Add: `VITE_API_URL` = your backend URL
4. Redeploy the frontend





