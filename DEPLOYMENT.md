# Deployment Guide - NM2TECH Analytics Shorts

## AWS Amplify Deployment (Frontend)

### Step 1: Prepare Your Repository

1. Ensure all code is committed and pushed to your Git repository (GitHub, GitLab, or Bitbucket)

### Step 2: Connect to AWS Amplify

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click **"New app"** → **"Host web app"**
3. Select your Git provider and repository
4. Authorize AWS Amplify to access your repository

### Step 3: Configure Build Settings

AWS Amplify will auto-detect the build settings, but you can verify:

**Build settings:**
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
```

**Environment variables (if needed):**
- `VITE_API_URL`: Your backend API URL (e.g., `https://api.example.com`)

### Step 4: Deploy

1. Click **"Save and deploy"**
2. Wait for the build to complete
3. Your app will be available at: `https://<app-id>.amplifyapp.com`

## AWS Lambda + API Gateway Deployment (Backend)

### Option 1: Using AWS SAM

1. **Install AWS SAM CLI:**
   ```bash
   # Windows
   pip install aws-sam-cli
   
   # macOS
   brew install aws-sam-cli
   ```

2. **Create `template.yaml`:**
   ```yaml
   AWSTemplateFormatVersion: '2010-09-09'
   Transform: AWS::Serverless-2016-10-31
   
   Resources:
     AnalyticsAPI:
       Type: AWS::Serverless::Function
       Properties:
         Handler: index.handler
         Runtime: nodejs18.x
         CodeUri: backend/
         Environment:
           Variables:
             OPENAI_API_KEY: !Ref OpenAIKey
         Events:
           ApiEvent:
             Type: Api
             Properties:
               Path: /{proxy+}
               Method: ANY
   ```

3. **Deploy:**
   ```bash
   sam build
   sam deploy --guided
   ```

### Option 2: Using Serverless Framework

1. **Install Serverless:**
   ```bash
   npm install -g serverless
   ```

2. **Create `serverless.yml`:**
   ```yaml
   service: nm2tech-analytics-api
   
   provider:
     name: aws
     runtime: nodejs18.x
     region: us-east-1
     environment:
       OPENAI_API_KEY: ${env:OPENAI_API_KEY}
   
   functions:
     api:
       handler: server.handler
       events:
         - http:
             path: /{proxy+}
             method: ANY
             cors: true
   ```

3. **Deploy:**
   ```bash
   serverless deploy
   ```

### Option 3: Manual Lambda Deployment

1. **Package your backend:**
   ```bash
   cd backend
   zip -r function.zip . -x "*.git*" "node_modules/*"
   ```

2. **Create Lambda function:**
   - Go to AWS Lambda Console
   - Create new function
   - Upload `function.zip`
   - Set handler to `server.handler`
   - Set runtime to Node.js 18.x

3. **Set up API Gateway:**
   - Create REST API
   - Create resource: `{proxy+}`
   - Create method: `ANY`
   - Integration type: Lambda Function
   - Enable CORS

4. **Configure environment variables:**
   - In Lambda function settings, add:
     - `OPENAI_API_KEY`: Your OpenAI API key (optional)

## S3 Setup (Optional - for file storage)

1. **Create S3 bucket:**
   ```bash
   aws s3 mb s3://nm2tech-analytics-uploads
   ```

2. **Update backend code:**
   - Install AWS SDK: `npm install aws-sdk`
   - Modify `backend/routes/upload.js` to upload files to S3
   - Configure IAM role with S3 permissions

## Environment Variables

### Frontend (Amplify)
- `VITE_API_URL`: Backend API URL

### Backend (Lambda)
- `OPENAI_API_KEY`: OpenAI API key (optional)
- `PORT`: Server port (usually not needed in Lambda)

## CORS Configuration

Ensure your backend API has CORS enabled:

```javascript
app.use(cors({
  origin: ['https://your-amplify-app.amplifyapp.com', 'http://localhost:3000'],
  credentials: true
}))
```

## Testing Deployment

1. **Test frontend:**
   - Visit your Amplify URL
   - Try uploading a file
   - Test example datasets

2. **Test backend:**
   - Use Postman or curl to test API endpoints
   - Verify CORS is working
   - Check CloudWatch logs for errors

## Troubleshooting

### Frontend not connecting to backend
- Check `VITE_API_URL` is set correctly
- Verify CORS settings in backend
- Check API Gateway CORS configuration

### Lambda function timeout
- Increase timeout in Lambda settings (default: 3 seconds, increase to 30+ seconds)
- Check CloudWatch logs for errors

### File upload fails
- Verify Lambda has proper permissions
- Check file size limits (10MB default)
- Ensure Multer is configured correctly

## Cost Optimization

- **Amplify:** Free tier includes 15 GB storage and 5 GB bandwidth/month
- **Lambda:** Free tier includes 1M requests/month
- **API Gateway:** Free tier includes 1M API calls/month
- **S3:** Pay per GB stored and transferred

## Security Best Practices

1. **API Keys:**
   - Store in environment variables, never in code
   - Use AWS Secrets Manager for sensitive keys

2. **CORS:**
   - Restrict origins to your frontend domain only

3. **File Uploads:**
   - Validate file types on backend
   - Set file size limits
   - Scan for malware (optional)

4. **Rate Limiting:**
   - Implement rate limiting on API Gateway
   - Use AWS WAF for DDoS protection

