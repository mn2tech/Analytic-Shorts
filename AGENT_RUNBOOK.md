# Agent Runbook - NM2-Analytics-Shorts

> This runbook is the source of truth for humans and AI agents working on this codebase.
> 
> If instructions conflict, this file takes precedence.

This runbook provides essential information for AI agents working with the NM2-Analytics-Shorts codebase.

## 📑 Table of Contents

1. [Quick Start Commands](#-quick-start-commands)
2. [How to Start / Stop the App](#-quick-start-commands)
3. [Key Configuration Files](#-key-configuration-files)
4. [Environment Variables Checklist](#-environment-variables-checklist)
5. [API Endpoints](#-api-endpoints)
6. [Important Code Locations](#-important-code-locations)
7. [Development Workflow](#️-development-workflow)
8. [Common Issues & Solutions](#-common-issues--solutions)
9. [Debugging Tips](#-debugging-tips)
10. [Emergency Fixes](#-emergency-fixes)
11. [CHANGELOG](#-changelog)

## 🎯 Project Overview

**NM2-Analytics-Shorts** is a full-stack analytics platform that allows users to:
- Upload CSV/Excel files
- Generate instant dashboards with auto-detected charts
- Use example datasets
- Save and share dashboards
- Access AI-powered insights

## 📁 Project Structure

```
NM2-Analytics-Shorts/
├── src/                    # Frontend (React + Vite)
│   ├── components/        # Reusable React components
│   ├── pages/             # Page components (Home, Dashboard, etc.)
│   ├── lib/               # Libraries (Supabase client)
│   ├── services/          # API service functions
│   ├── contexts/          # React contexts (Auth, etc.)
│   └── config/            # Configuration (API client)
│
├── backend/               # Backend (Express.js)
│   ├── routes/           # API endpoints
│   ├── controllers/      # Business logic
│   ├── middleware/       # Express middleware
│   └── server.js         # Main server file
│
├── public/               # Static assets
├── database/             # Database schemas (Supabase)
└── scripts/              # Utility scripts
```

## 🚀 Quick Start Commands

### Start Everything
```powershell
# Windows
.\start.ps1

# Or use npm
npm start
# or
npm run dev:all
```

### Start Separately
```powershell
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
cd backend
npm start
```

### Stop Servers
- Press `Ctrl+C` in terminal
- Or use: `.\restart.ps1` (stops and provides restart instructions)

## 🔧 Key Configuration Files

### Frontend
- `package.json` - Dependencies and scripts
- `vite.config.js` - Vite configuration (proxy, PWA, etc.)
- `tailwind.config.js` - Tailwind CSS configuration
- `.env` (root) - Frontend environment variables
  - `VITE_API_URL` - Backend API URL
  - `VITE_SUPABASE_URL` - Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

### Backend
- `backend/package.json` - Backend dependencies
- `backend/server.js` - Main Express server
- `backend/.env` - Backend environment variables
  - `PORT` - Server port (default: 5000)
  - `SUPABASE_URL` - Supabase project URL
  - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
  - `STRIPE_SECRET_KEY` - Stripe secret key
  - `OPENAI_API_KEY` - OpenAI API key (optional)
  - `FRONTEND_URL` - Frontend URL for redirects
  - `ALLOWED_ORIGINS` - CORS allowed origins

## 📡 API Endpoints

### Health Check
- `GET /api/health` - Check API status

### File Upload
- `POST /api/upload` - Upload CSV/Excel file
  - Requires: `file` (multipart/form-data)
  - Returns: Processed data with column types

### Example Datasets
- `GET /api/example/sales` - Sales data
- `GET /api/example/attendance` - Attendance data
- `GET /api/example/donations` - Donations data
- `GET /api/example/medical` - Medical data
- `GET /api/example/banking` - Business expenses
- `GET /api/example/yearly-income` - Yearly income growth

### Dashboards (Requires Auth)
- `GET /api/dashboards` - Get user's dashboards
- `GET /api/dashboards/:id` - Get specific dashboard
- `POST /api/dashboards` - Create dashboard
- `PUT /api/dashboards/:id` - Update dashboard
- `DELETE /api/dashboards/:id` - Delete dashboard

### Insights
- `POST /api/insights` - Generate AI insights
  - Body: `{ data, columns, numericColumns, categoricalColumns }`

### Subscriptions
- `GET /api/subscription/status` - Get user subscription
- `POST /api/subscription/checkout` - Create checkout session
- `POST /api/subscription/webhook` - Stripe webhook handler

## 🔍 Common Issues & Solutions

### Backend Not Starting
1. Check if port 5000 is in use
2. Verify `backend/.env` exists
3. Check Node.js version (needs v16+)
4. Run `cd backend && npm install`

### Frontend Can't Connect to Backend
1. Verify backend is running on port 5000
2. Check `VITE_API_URL` in `.env` (should be `http://localhost:5000` for local)
3. Check CORS settings in `backend/server.js`
4. Verify Vite proxy in `vite.config.js`

### Example Datasets Not Working
1. Ensure backend is running
2. Check route exists in `backend/routes/examples.js`
3. Verify data format (numeric columns should be numbers, not strings)
4. Check browser console for errors

### Dashboard Not Loading
1. Clear browser `sessionStorage`
2. Check browser console (F12) for errors
3. Verify data structure matches expected format
4. Check if user is authenticated (for saved dashboards)

### Supabase Errors
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`
2. Check Supabase project is active
3. Verify database tables exist (run `database/schema.sql`)
4. Check authentication tokens in browser

## 🛠️ Development Workflow

### Making Changes

1. **Frontend Changes**
   - Edit files in `src/`
   - Vite hot-reloads automatically
   - Check browser console for errors

2. **Backend Changes**
   - Edit files in `backend/`
   - Restart backend: `cd backend && npm start`
   - Check terminal for errors

3. **Database Changes**
   - Edit `database/schema.sql`
   - Run in Supabase SQL Editor
   - Update backend code if needed

### Testing

1. **Test Example Datasets**
   - Click example buttons on home page
   - Verify charts render correctly
   - Check filters work

2. **Test File Upload**
   - Upload a CSV/Excel file
   - Verify data processing
   - Check dashboard generation

3. **Test Authentication**
   - Sign up new user
   - Sign in
   - Test dashboard saving

## 📝 Important Code Locations

### Frontend
- `src/pages/Home.jsx` - Home page with upload
- `src/pages/Dashboard.jsx` - Main dashboard component
- `src/components/FileUploader.jsx` - File upload component
- `src/components/ExampleDatasetButton.jsx` - Example datasets
- `src/config/api.js` - API client configuration
- `src/lib/supabase.js` - Supabase client

### Backend
- `backend/server.js` - Main server setup
- `backend/routes/upload.js` - File upload handling
- `backend/routes/examples.js` - Example datasets
- `backend/routes/dashboards.js` - Dashboard CRUD
- `backend/controllers/dataProcessor.js` - Data processing logic
- `backend/middleware/usageLimits.js` - Usage limit checks

## 🔐 Environment Variables Checklist

### Required for Basic Functionality
- [ ] `PORT=5000` (backend)
- [ ] `VITE_API_URL` (frontend, for production)

### Required for Dashboard Saving
- [ ] `SUPABASE_URL` (backend)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (backend)
- [ ] `VITE_SUPABASE_URL` (frontend)
- [ ] `VITE_SUPABASE_ANON_KEY` (frontend)

### Required for Payments
- [ ] `STRIPE_SECRET_KEY` (backend)
- [ ] `FRONTEND_URL` (backend)

### Optional
- [ ] `OPENAI_API_KEY` (backend, for AI insights)
- [ ] `ALLOWED_ORIGINS` (backend, for CORS)

## 🐛 Debugging Tips

1. **Check Backend Logs**
   - Look at terminal where backend is running
   - Check for error messages
   - Verify routes are registered

2. **Check Frontend Console**
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

3. **Test API Directly**
   ```powershell
   # Test health
   Invoke-WebRequest http://localhost:5000/api/health
   
   # Test example
   Invoke-WebRequest http://localhost:5000/api/example/sales
   ```

4. **Verify Data Format**
   - Check API response structure
   - Verify column types are correct
   - Ensure numeric columns are numbers, not strings

## 📚 Documentation Files

- `README.md` - Main project documentation
- `AMPLIFY_SETUP.md` - AWS Amplify deployment guide
- `QUICKSTART.md` - Quick start guide
- `TROUBLESHOOTING.md` - Troubleshooting guide
- `SUPABASE_SETUP_INSTRUCTIONS.md` - Supabase setup
- `STRIPE_SETUP.md` - Stripe payment setup

## 🚨 Emergency Fixes

### Backend Won't Start
```powershell
# Kill all Node processes
Get-Process node | Stop-Process -Force

# Restart
cd backend
npm start
```

### Frontend Won't Load
```powershell
# Clear node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install

# Restart
npm run dev
```

### Database Issues
1. Check Supabase dashboard
2. Verify tables exist
3. Check RLS policies
4. Verify service role key

## 📞 Getting Help

1. Check relevant `.md` files in project root
2. Review browser console errors
3. Check backend terminal logs
4. Verify environment variables
5. Test API endpoints directly

## 📝 CHANGELOG

### 2025-01-03
- ✅ Created AGENT_RUNBOOK.md
- ✅ Added Table of Contents
- ✅ Fixed Yearly Income dataset (numeric values instead of currency strings)
- ✅ Added automated startup script (`start.ps1`)
- ✅ Added `npm start` command to run both frontend and backend

### Previous Updates
- Fixed example datasets endpoint handling
- Improved data processing for numeric columns
- Enhanced error handling in dashboard loading
- Added comprehensive troubleshooting guides

---

**Last Updated**: 2025-01-03
**Project**: NM2-Analytics-Shorts
**Repository**: https://github.com/mn2tech/Analytic-Shorts

