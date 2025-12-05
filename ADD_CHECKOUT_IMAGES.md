# Add Images to Stripe Checkout

## ✅ Setup Complete!

I've configured the code to use images in the Stripe checkout. Here's what's been set up:

### 📁 Folder Created
- **`public/images/`** - Place your plan images here

### 🔧 Code Updated
- Frontend: Uses `/images/pro-plan.jpg` and `/images/enterprise-plan.jpg`
- Backend: Converts local paths to full URLs for Stripe
- Fallback: If images don't exist, you can use external URLs via environment variables

## 🖼️ Add Your Images (3 Options)

### Option 1: Add Local Images (Recommended)

1. **Create or download images:**
   - Pro Plan image (400x400px, square)
   - Enterprise Plan image (400x400px, square)

2. **Save them in `public/images/`:**
   - `pro-plan.jpg` (or `.png`)
   - `enterprise-plan.jpg` (or `.png`)

3. **That's it!** The app will automatically use them.

### Option 2: Use External URLs (Quick Start)

If you don't have images yet, you can use external URLs:

**Edit `.env.local`:**
```env
VITE_PRO_PLAN_IMAGE=https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop
VITE_ENTERPRISE_PLAN_IMAGE=https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop
```

### Option 3: Use Your Existing Images

If you have images hosted elsewhere:

**Edit `.env.local`:**
```env
VITE_PRO_PLAN_IMAGE=https://your-domain.com/images/pro-plan.jpg
VITE_ENTERPRISE_PLAN_IMAGE=https://your-domain.com/images/enterprise-plan.jpg
```

## 🎨 Quick Image Creation

### Using Online Tools:
1. **Canva** - Create branded plan images
2. **Figma** - Design custom graphics
3. **Unsplash** - Download free stock photos
4. **Your logo** - Add plan name text

### Image Specifications:
- **Size:** 400x400px (square) or larger
- **Format:** JPG, PNG, or WebP
- **File size:** Under 500KB
- **Content:** Logo, screenshot, or branded graphic

## 📝 Current Status

**Images folder:** ✅ Created (`public/images/`)  
**Code:** ✅ Configured to use local images  
**Images files:** ❌ **You need to add these!**

## 🧪 Test It

1. **Add your images** to `public/images/`
2. **Restart frontend:** `npm run dev`
3. **Go to:** `http://localhost:3000/pricing`
4. **Click "Upgrade"** on a plan
5. **Check Stripe checkout** - your image should appear!

## 🚀 Production

For production (Amplify), images in `public/images/` will be automatically deployed. Make sure:
- Images are in `public/images/` folder
- They're committed to git
- They'll be served from your domain (e.g., `https://your-domain.com/images/pro-plan.jpg`)

## 📋 Checklist

- [ ] Created `public/images/` folder ✅ (Done!)
- [ ] Added `pro-plan.jpg` (You need to do this)
- [ ] Added `enterprise-plan.jpg` (You need to do this)
- [ ] Tested checkout with images
- [ ] Images appear in Stripe checkout page

---

**Note:** The code is ready! You just need to add the actual image files to `public/images/`.



