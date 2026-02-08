# NM2TECH Analytics Shorts

A modern, fast, and mobile-friendly web application for uploading CSV/Excel files and generating instant charts, statistics, and AI-powered insights. Perfect for quick demos and analytics dashboards.

## 🚀 Features

- **File Upload**: Support for CSV and Excel (XLSX) files
- **Auto Dashboard Generation**: Automatically detects column types and generates charts
- **Multiple Chart Types**: Bar, Line, and Pie charts with Recharts
- **Smart Filters**: Date range, category dropdown, and numeric range sliders
- **Summary Statistics**: Total rows, sum, average, min, max, and trend analysis
- **Export Functionality**: Download charts as PNG and data as CSV
- **AI Insights**: Generate intelligent insights using OpenAI (optional) or rule-based analysis
- **Example Datasets**: Try the platform with pre-built datasets (Sales, Attendance, Donations)
- **Responsive Design**: Mobile-first design with TailwindCSS
- **Smooth Animations**: Optimized for video demos with fade-in and loading animations
- **AI Visual Builder Studio** (at `/studio`): Create dashboards from natural-language prompts; save, share, and get public view-only links. See [STUDIO.md](./STUDIO.md) for a short guide. For full spec storage, run the migration in **database/migration_add_dashboard_schema_column.sql** (see database/README.md).

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- (Optional) OpenAI API key for AI insights

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd NM2-Analytics-Shorts
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd backend
npm install
cd ..
```

### 4. Set up environment variables (optional)

Create a `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your OpenAI API key (optional):

```
PORT=5000
OPENAI_API_KEY=your_openai_api_key_here
```

## 🏃 Running Locally

### Option 1: Run both frontend and backend together

```bash
npm run dev:all
```

### Option 2: Run separately

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend:**
```bash
cd backend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📁 Project Structure

```
NM2-Analytics-Shorts/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── FileUploader.jsx
│   │   ├── SummaryStats.jsx
│   │   ├── ChartSection.jsx
│   │   ├── Filters.jsx
│   │   ├── Loader.jsx
│   │   ├── ExampleDatasetButton.jsx
│   │   └── AIInsights.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   └── Dashboard.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── backend/
│   ├── routes/
│   │   ├── upload.js
│   │   ├── insights.js
│   │   └── examples.js
│   ├── controllers/
│   │   └── dataProcessor.js
│   ├── server.js
│   └── package.json
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🚢 Deployment

### Frontend - AWS Amplify

1. **Build the frontend:**
   ```bash
   npm run build
   ```

2. **Deploy to AWS Amplify:**
   - Go to AWS Amplify Console
   - Click "New app" → "Host web app"
   - Connect your Git repository or upload the `dist` folder
   - Build settings (auto-detected):
     - Build command: `npm run build`
     - Output directory: `dist`

3. **Environment Variables (if needed):**
   - Add `VITE_API_URL` if your backend is on a different domain

### Backend - AWS Lambda + API Gateway

1. **Install Serverless Framework (optional):**
   ```bash
   npm install -g serverless
   ```

2. **Create Lambda function:**
   - Package the backend code
   - Upload to Lambda or use AWS SAM/Serverless Framework

3. **Alternative: Deploy to AWS Elastic Beanstalk:**
   - Create a `.ebextensions` folder
   - Deploy using EB CLI

4. **Set up API Gateway:**
   - Create REST API
   - Connect to Lambda functions
   - Enable CORS

### S3 for File Storage (Optional)

If you want to store uploaded files in S3:

1. Create an S3 bucket
2. Update `backend/routes/upload.js` to use AWS SDK
3. Configure IAM permissions

## 🧪 Testing

### Sample Datasets

The platform includes three example datasets:
- **Sales Data**: Monthly sales with products, categories, and regions
- **Attendance Data**: Employee attendance records
- **Donations Data**: Charity donations by category

Click "Try Example Dashboard" on the home page to test without uploading files.

### Manual Testing

1. Upload a CSV file with numeric and categorical columns
2. Verify charts are generated automatically
3. Test filters (date, category, numeric range)
4. Export charts and CSV
5. Generate AI insights

## 🔧 Configuration

### API Endpoints

- `POST /api/upload` - Upload and parse CSV/Excel file
- `POST /api/insights` - Generate AI insights
- `GET /api/example/sales` - Get sales example dataset
- `GET /api/example/attendance` - Get attendance example dataset
- `GET /api/example/donations` - Get donations example dataset
- `GET /api/health` - Health check

### Customization

- **Chart Colors**: Edit `COLORS` array in `src/components/ChartSection.jsx`
- **File Size Limit**: Update `limits.fileSize` in `backend/routes/upload.js`
- **AI Model**: Change model in `backend/routes/insights.js` (default: `gpt-3.5-turbo`)

## 📝 Usage

1. **Upload File:**
   - Drag and drop a CSV or Excel file
   - Or click "Browse Files"
   - File is automatically parsed and analyzed

2. **Explore Dashboard:**
   - View auto-generated charts
   - Check summary statistics
   - Apply filters to refine data

3. **Export Data:**
   - Download charts as PNG
   - Export filtered data as CSV

4. **Get Insights:**
   - Click "Generate Insights" for AI-powered analysis
   - Insights appear in the AI Insights panel

## 🎬 Demo Optimization

The platform is optimized for quick video demos:
- Instant loading animations
- Smooth chart rendering
- Fast filter updates
- One-click example datasets

## 🐛 Troubleshooting

### File upload fails
- Check file size (max 10MB)
- Ensure file is CSV or Excel format
- Check backend server is running

### Charts not rendering
- Verify data has numeric columns
- Check browser console for errors
- Ensure Recharts is installed

### AI insights not working
- Check OpenAI API key is set (optional)
- Platform falls back to rule-based insights if API key is missing
- Check network connectivity

## 📄 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ using React, Vite, Express, and TailwindCSS

