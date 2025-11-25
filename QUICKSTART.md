# Quick Start Guide

Get the NM2TECH Analytics Shorts running in 5 minutes!

## Prerequisites Check

```bash
node --version  # Should be v16 or higher
npm --version   # Should be v6 or higher
```

## Installation

1. **Install dependencies:**
   ```bash
   # Install frontend dependencies
   npm install
   
   # Install backend dependencies
   cd backend
   npm install
   cd ..
   ```

2. **Start the development servers:**

   **Option A: Run both together (recommended)**
   ```bash
   npm run dev:all
   ```

   **Option B: Run separately**
   
   Terminal 1:
   ```bash
   npm run dev
   ```
   
   Terminal 2:
   ```bash
   cd backend
   npm start
   ```

3. **Open your browser:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## First Steps

1. **Try an example dataset:**
   - Click "Try Example Dashboard" on the home page
   - Select "Sales Data", "Attendance Data", or "Donations Data"
   - Dashboard will load automatically

2. **Upload your own file:**
   - Prepare a CSV or Excel file with:
     - At least one numeric column (for charts)
     - Optional: date column, category column
   - Drag and drop or click "Browse Files"
   - Wait for processing (usually < 2 seconds)

3. **Explore the dashboard:**
   - View auto-generated charts
   - Apply filters in the sidebar
   - Check summary statistics
   - Generate AI insights (optional)

## Sample CSV Format

Create a file `sample.csv`:

```csv
Date,Product,Category,Sales,Units
2024-01-01,Laptop,Electronics,12500,25
2024-01-02,Mouse,Electronics,1500,150
2024-01-03,Desk,Furniture,4500,15
2024-01-04,Chair,Furniture,3200,20
2024-01-05,Monitor,Electronics,8500,17
```

Upload this file to see instant charts and insights!

## Troubleshooting

### Port already in use
```bash
# Change port in vite.config.js (frontend)
# Change PORT in backend/.env (backend)
```

### CORS errors
- Ensure backend is running on port 5000
- Check `vite.config.js` proxy settings

### File upload fails
- Check file size (max 10MB)
- Ensure file is CSV or Excel format
- Check backend console for errors

### Charts not showing
- Verify your data has numeric columns
- Check browser console for errors
- Ensure data was parsed correctly

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions
- Customize charts and styling in `src/components/`
- Add your OpenAI API key for AI insights in `backend/.env`

## Need Help?

- Check the browser console for errors
- Check the backend terminal for server errors
- Review the README.md for detailed information

Happy analyzing! 📊

