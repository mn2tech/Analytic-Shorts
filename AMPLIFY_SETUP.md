# AWS Amplify Deployment Guide

This guide will help you deploy the NM2TECH Analytics Shorts application to AWS Amplify.

## Prerequisites

1. AWS Account
2. GitHub repository connected (already done: https://github.com/mn2tech/Analytic-Shorts)
3. Backend API endpoint (see Backend Setup section)

## Frontend Deployment (AWS Amplify)

### Step 1: Connect Repository to Amplify

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. Click **"New app"** → **"Host web app"**
3. Select **GitHub** as your source
4. Authorize GitHub if needed
5. Select repository: `mn2tech/Analytic-Shorts`
6. Select branch: `main`
7. Click **"Next"**

### Step 2: Configure Build Settings

Amplify should auto-detect the `amplify.yml` file. Verify these settings:

- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Node version**: 18.x or higher

### Step 3: Environment Variables

Add these environment variables in Amplify Console → App settings → Environment variables:

```
VITE_API_URL=https://your-backend-api-url.com
```

**Important**: Replace `https://your-backend-api-url.com` with your actual backend API URL.

### Step 4: Deploy

1. Click **"Save and deploy"**
2. Wait for the build to complete (usually 3-5 minutes)
3. Your app will be live at: `https://main.xxxxx.amplifyapp.com`

## Backend Setup Options

The backend needs to be hosted separately. Here are your options:

### Option 1: AWS Lambda + API Gateway (Recommended)

1. **Create Lambda Functions**:
   - Upload handler
   - Insights handler
   - Example data handler

2. **Set up API Gateway**:
   - Create REST API
   - Configure CORS
   - Connect Lambda functions
   - Deploy to stage

3. **Update Environment Variable**:
   - In Amplify, set `VITE_API_URL` to your API Gateway endpoint

### Option 2: AWS Elastic Beanstalk

1. Package backend:
   ```bash
   cd backend
   zip -r ../backend.zip . -x "node_modules/*" "uploads/*"
   ```

2. Deploy to Elastic Beanstalk:
   - Create new application
   - Upload `backend.zip`
   - Configure environment variables

3. Update `VITE_API_URL` in Amplify

### Option 3: EC2 Instance

1. Launch EC2 instance (t2.micro is fine for testing)
2. Install Node.js
3. Clone repository
4. Run backend:
   ```bash
   cd backend
   npm install
   npm start
   ```
5. Configure security group to allow HTTP/HTTPS
6. Update `VITE_API_URL` in Amplify

### Option 4: Use Existing Backend

If you already have a backend server, just update the `VITE_API_URL` environment variable in Amplify.

## Custom Domain (Optional)

1. In Amplify Console → Domain management
2. Add your custom domain
3. Follow DNS configuration instructions
4. SSL certificate is automatically provisioned

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `https://api.example.com` |
| `OPENAI_API_KEY` | (Backend only) OpenAI API key for AI insights | `sk-...` |

## Troubleshooting

### Build Fails
- Check Node.js version (should be 18+)
- Verify `amplify.yml` syntax
- Check build logs in Amplify Console

### API Calls Fail
- Verify `VITE_API_URL` is set correctly
- Check CORS configuration on backend
- Ensure backend is accessible from internet

### PWA Not Working
- Ensure icons are in `public/` folder
- Check service worker registration
- Verify HTTPS is enabled (required for PWA)

## Post-Deployment Checklist

- [ ] Frontend deployed successfully
- [ ] Backend API is accessible
- [ ] Environment variables configured
- [ ] CORS configured on backend
- [ ] Test file upload
- [ ] Test example datasets
- [ ] Test AI insights (if OpenAI key is set)
- [ ] Test shareable dashboard links
- [ ] Verify PWA installation works
- [ ] Test on mobile devices

## Support

For issues, check:
- Amplify build logs
- Browser console for frontend errors
- Backend server logs
- Network tab for API call failures

