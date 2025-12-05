# Plan Images for Stripe Checkout

## 📁 Place Your Images Here

Add your plan images to this folder:

- **`pro-plan.jpg`** or **`pro-plan.png`** - Image for Pro Plan (400x400px recommended)
- **`enterprise-plan.jpg`** or **`enterprise-plan.png`** - Image for Enterprise Plan (400x400px recommended)

## 🖼️ Image Requirements

- **Format:** JPG, PNG, or WebP
- **Size:** 400x400px or larger (square format recommended)
- **File size:** Keep under 500KB for fast loading
- **Content:** Your logo, product screenshot, or branded graphic

## 📝 How to Add Images

1. **Create or download your images**
2. **Save them in this folder** (`public/images/`)
3. **Name them:**
   - `pro-plan.jpg` (or `.png`)
   - `enterprise-plan.jpg` (or `.png`)
4. **The app will automatically use them!**

## 🔄 Current Setup

The app is configured to use:
- `/images/pro-plan.jpg` for Pro Plan
- `/images/enterprise-plan.jpg` for Enterprise Plan

If these files don't exist, it will fall back to Unsplash placeholder images.

## 🎨 Image Ideas

- Your app logo with "Pro" or "Enterprise" text
- Screenshots showing plan features
- Branded graphics matching your design
- Icons representing the plan tier

## ✅ After Adding Images

1. Restart your frontend: `npm run dev`
2. Test checkout: Go to `/pricing` and click "Upgrade"
3. Check Stripe checkout page - your images should appear!



