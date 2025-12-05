# Customize Checkout Images

## ✅ Images Now Added to Checkout!

Product images are now displayed in the Stripe checkout page. When users click "Upgrade" on a plan, they'll see the plan image in the Stripe checkout session.

## 🖼️ How It Works

1. **Default Images:** The app uses placeholder images from Unsplash by default
2. **Custom Images:** You can override these with your own images via environment variables
3. **Stripe Display:** Images appear in the Stripe checkout page automatically

## 📝 Customize Images

### Option 1: Use Environment Variables (Recommended)

Add to `.env.local`:

```env
# Custom plan images (optional)
VITE_PRO_PLAN_IMAGE=https://your-domain.com/images/pro-plan.jpg
VITE_ENTERPRISE_PLAN_IMAGE=https://your-domain.com/images/enterprise-plan.jpg
```

**Image Requirements:**
- Must be publicly accessible URLs (HTTPS)
- Recommended size: 400x400px or larger (square)
- Supported formats: JPG, PNG, WebP
- Stripe will automatically resize/optimize

### Option 2: Update Code Directly

Edit `src/config/pricing.js` and change the image URLs:

```javascript
pro: {
  // ...
  image: 'https://your-domain.com/images/pro-plan.jpg',
  // ...
},
enterprise: {
  // ...
  image: 'https://your-domain.com/images/enterprise-plan.jpg',
  // ...
}
```

## 🎨 Image Ideas

You can use:
- **Your logo** with plan name
- **Product screenshots** showing plan features
- **Icons** representing the plan tier
- **Branded graphics** matching your design

## 📤 Hosting Images

### Option 1: Public Folder (Vite)
1. Add images to `public/images/` folder
2. Use: `VITE_PRO_PLAN_IMAGE=/images/pro-plan.jpg`
3. Images will be served from your domain

### Option 2: CDN/Cloud Storage
- **AWS S3 + CloudFront**
- **Cloudinary**
- **Imgix**
- **Your own server**

### Option 3: Image Hosting Services
- **Imgur** (free)
- **Unsplash** (free stock photos)
- **Your website's public directory**

## 🧪 Testing

1. Set custom image URLs in `.env.local`
2. Restart frontend: `npm run dev`
3. Go to `/pricing` page
4. Click "Upgrade" on a plan
5. Check Stripe checkout page - you should see your image!

## 📋 Example `.env.local`

```env
# Supabase
VITE_SUPABASE_URL=https://ybpzhhzadvarebdclykl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe Price IDs
VITE_STRIPE_PRO_PRICE_ID=price_xxxxx
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_xxxxx

# Custom Plan Images (optional)
VITE_PRO_PLAN_IMAGE=https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop
VITE_ENTERPRISE_PLAN_IMAGE=https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop

# Backend API
VITE_API_URL=http://localhost:5000
```

## 🚀 Production (Amplify)

For production, add the image URLs to **Amplify Environment Variables**:

1. Go to **AWS Amplify Console** → Your App
2. Click **App settings** → **Environment variables**
3. Add:
   - `VITE_PRO_PLAN_IMAGE` = `https://your-domain.com/images/pro-plan.jpg`
   - `VITE_ENTERPRISE_PLAN_IMAGE` = `https://your-domain.com/images/enterprise-plan.jpg`
4. Redeploy

Or add to `amplify.yml`:

```yaml
environment:
  VITE_API_URL: https://api.nm2tech-sas.com
  VITE_PRO_PLAN_IMAGE: https://your-domain.com/images/pro-plan.jpg
  VITE_ENTERPRISE_PLAN_IMAGE: https://your-domain.com/images/enterprise-plan.jpg
```

## ✅ Current Default Images

- **Pro Plan:** Analytics/data visualization image from Unsplash
- **Enterprise Plan:** Business/team collaboration image from Unsplash

These are just placeholders - replace them with your own branded images!

## 🆘 Troubleshooting

**Image not showing in checkout?**
- Check the image URL is publicly accessible
- Verify the URL is HTTPS (Stripe requires HTTPS)
- Check browser console for image loading errors
- Make sure you restarted the frontend after changing `.env.local`

**Image looks blurry?**
- Use higher resolution images (at least 400x400px)
- Use PNG or WebP format for better quality
- Stripe will optimize automatically

---

**Note:** Images are optional. If no image URL is provided, Stripe will show the product without an image (or use the image you set in Stripe Dashboard).



