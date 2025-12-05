# AWS Backend Deployment Guide

Deploy the backend API to AWS using Lambda + API Gateway or Elastic Beanstalk.

## Option 1: AWS Lambda + API Gateway (Serverless - Recommended)

### Prerequisites
- AWS CLI installed and configured
- AWS SAM CLI installed (optional, but recommended)

### Step 1: Install AWS SAM CLI

**Windows:**
```powershell
# Using Chocolatey
choco install aws-sam-cli

# Or download from: https://github.com/aws/aws-sam-cli/releases
```

**macOS:**
```bash
brew install aws-sam-cli
```

### Step 2: Create Lambda Handler

The Express app needs to be wrapped for Lambda. Create `backend/lambda.js`:

```javascript
const serverless = require('serverless-http')
const app = require('./server')

// Export the Express app wrapped for Lambda
module.exports.handler = serverless(app)
```

### Step 3: Install Serverless HTTP

```bash
cd backend
npm install serverless-http
```

### Step 4: Create SAM Template

Create `template.yaml` in the root directory:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: NM2TECH Analytics Shorts Backend API

Globals:
  Function:
    Timeout: 30
    MemorySize: 512
    Runtime: nodejs18.x
    Environment:
      Variables:
        OPENAI_API_KEY: !Ref OpenAIApiKey

Resources:
  AnalyticsAPI:
    Type: AWS::Serverless::Function
    Properties:
      Handler: backend/lambda.handler
      CodeUri: backend/
      Events:
        ApiEvent:
          Type: HttpApi
          Properties:
            Path: /{proxy+}
            Method: ANY
        RootEvent:
          Type: HttpApi
          Properties:
            Path: /
            Method: ANY
      Policies:
        - Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action:
                - logs:CreateLogGroup
                - logs:CreateLogStream
                - logs:PutLogEvents
              Resource: '*'

  AnalyticsApiGateway:
    Type: AWS::Serverless::HttpApi
    Properties:
      CorsConfiguration:
        AllowOrigins:
          - '*'
        AllowMethods:
          - GET
          - POST
          - PUT
          - DELETE
          - OPTIONS
        AllowHeaders:
          - '*'
        MaxAge: 300

Parameters:
  OpenAIApiKey:
    Type: String
    Default: ''
    Description: OpenAI API Key (optional, for AI insights)
    NoEcho: true

Outputs:
  ApiUrl:
    Description: API Gateway endpoint URL
    Value: !Sub 'https://${ServerlessHttpApi}.execute-api.${AWS::Region}.amazonaws.com'
    Export:
      Name: AnalyticsApiUrl
```

### Step 5: Deploy with SAM

```bash
# Build
sam build

# Deploy (first time - guided)
sam deploy --guided

# Subsequent deployments
sam deploy
```

**During guided deployment:**
- Stack name: `nm2tech-analytics-api`
- AWS Region: Choose your region (e.g., `us-east-1`)
- OpenAI API Key: Enter your key or leave empty
- Confirm changes: Yes
- Allow SAM CLI IAM role creation: Yes

### Step 6: Get API URL

After deployment, SAM will output the API URL:
```
ApiUrl = https://abc123xyz.execute-api.us-east-1.amazonaws.com
```

### Step 7: Update Amplify

1. Go to AWS Amplify Console
2. App settings → Environment variables
3. Add: `VITE_API_URL` = your API Gateway URL
4. Redeploy frontend

---

## Option 2: AWS Elastic Beanstalk (Easier Setup)

### Step 1: Install EB CLI

```bash
pip install awsebcli
```

### Step 2: Initialize Elastic Beanstalk

```bash
cd backend
eb init
```

**Configuration:**
- Select region (e.g., `us-east-1`)
- Select application: Create new application
- Application name: `nm2tech-analytics`
- Platform: Node.js
- Platform version: Latest
- SSH: Yes (optional)
- Keypair: Create new or select existing

### Step 3: Create Environment

```bash
eb create nm2tech-analytics-env
```

This will:
- Create EC2 instance
- Set up load balancer
- Deploy your code
- Provide a URL

### Step 4: Configure Environment Variables

```bash
eb setenv OPENAI_API_KEY=your-key-here
```

Or in EB Console:
1. Go to Elastic Beanstalk Console
2. Select your environment
3. Configuration → Software → Environment properties
4. Add `OPENAI_API_KEY`

### Step 5: Get Application URL

```bash
eb status
```

Or check the Elastic Beanstalk Console dashboard.

### Step 6: Update Amplify

1. Add `VITE_API_URL` = your EB URL
2. Redeploy frontend

---

## Option 3: EC2 Instance (Full Control)

### Step 1: Launch EC2 Instance

1. Go to EC2 Console
2. Launch Instance
3. **Choose:**
   - AMI: Ubuntu Server 22.04 LTS
   - Instance type: t2.micro (free tier) or t3.small
   - Security group: Allow HTTP (80), HTTPS (443), and SSH (22)
4. Launch

### Step 2: Connect and Setup

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Clone repository
git clone https://github.com/mn2tech/Analytic-Shorts.git
cd Analytic-Shorts/backend

# Install dependencies
npm install

# Create .env file
echo "PORT=80" > .env
echo "OPENAI_API_KEY=your-key" >> .env

# Start with PM2
pm2 start server.js --name analytics-api
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

### Step 3: Configure Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt-get update
sudo apt-get install nginx

# Create config
sudo nano /etc/nginx/sites-available/analytics-api
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/analytics-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 4: Get Public IP/Domain

Use the EC2 public IP or configure a domain.

### Step 5: Update Amplify

Add `VITE_API_URL` = `http://your-ec2-ip` or your domain.

---

## Cost Comparison

| Option | Cost (Monthly) | Setup Time |
|--------|---------------|------------|
| Lambda + API Gateway | ~$0-5 (free tier: 1M requests) | 15-30 min |
| Elastic Beanstalk | ~$15-30 (t2.micro) | 10-15 min |
| EC2 | ~$10-20 (t2.micro) | 20-30 min |

**Recommendation:** Start with Lambda + API Gateway (serverless, pay-per-use, scales automatically).

---

## Troubleshooting

### Lambda Timeout
- Increase timeout in `template.yaml`: `Timeout: 60`

### CORS Issues
- Verify CORS is configured in API Gateway
- Check `ALLOWED_ORIGINS` environment variable

### API Not Responding
- Check CloudWatch logs
- Verify Lambda function is deployed
- Test health endpoint: `curl https://your-api-url/api/health`

---

## Quick Start Commands

**Lambda (SAM):**
```bash
cd backend
npm install serverless-http
cd ..
sam build
sam deploy --guided
```

**Elastic Beanstalk:**
```bash
cd backend
eb init
eb create
eb deploy
```





