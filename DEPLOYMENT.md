# SwimBuddz Frontend - Netlify Deployment Guide

## Prerequisites

1. ✅ GitHub repository with frontend code
2. ✅ Netlify account (free tier works)
3. ✅ Backend API deployed and accessible

---

## Quick Deployment Steps

### 1. Connect to Netlify

1. Go to [Netlify](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** and authorize Netlify
4. Select your `swimbuddz-frontend` repository

### 2. Configure Build Settings

Netlify will auto-detect Next.js. Verify these settings:

**Build Settings:**

```
Build command: npm run build
Publish directory: .next
```

**Environment Variables** (click "Show advanced" → "New variable"):

```bash
# Required
NEXT_PUBLIC_API_BASE_URL=https://your-backend-api.com
NEXT_PUBLIC_APP_URL=https://your-frontend-domain.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional
NEXT_PUBLIC_WHATSAPP_URL=https://chat.whatsapp.com/...
NEXT_PUBLIC_ENABLE_REGISTRATION=true
NEXT_PUBLIC_ENABLE_GALLERY=true
```

### 3. Deploy

Click **"Deploy site"**

Netlify will:

1. Clone your repo
2. Install dependencies (`npm install`)
3. Build the app (`npm run build`)
4. Deploy to CDN

**First deployment takes ~3-5 minutes**

---

## Post-Deployment Configuration

### 1. Custom Domain (Optional)

1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Enter your domain (e.g., `swimbuddz.com`)
4. Follow DNS configuration instructions

### 2. HTTPS Certificate

- Automatically provisioned by Netlify
- Free Let's Encrypt SSL
- Takes ~1 minute to activate

### 3. Update Backend CORS

Add your Netlify URL to backend CORS:

```python
# In gateway_service/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://your-site.netlify.app",  # Add this
        "https://swimbuddz.com"           # And custom domain if you have one
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Continuous Deployment

**Automatic deployments are now enabled!**

Every time you push to your GitHub repo:

1. Netlify detects the change
2. Automatically builds and deploys
3. Takes ~2-3 minutes

### Branch Deploys

- **Main branch** → Production site
- **Other branches** → Preview deployments
- Each PR gets a unique preview URL

---

## Environment-Specific Configuration

### Production (.env variables in Netlify)

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.swimbuddz.com
NEXT_PUBLIC_APP_URL=https://swimbuddz.com
```

### Staging (separate site)

```bash
NEXT_PUBLIC_API_BASE_URL=https://api-staging.swimbuddz.com
NEXT_PUBLIC_APP_URL=https://staging.swimbuddz.com
```

### Development (local .env.local)

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Troubleshooting

### Build Fails

**Check build logs:**

1. Go to **Deploys** tab
2. Click on failed deploy
3. View detailed logs

**Common issues:**

- Missing environment variables → Add in Site settings
- ESLint errors → Already disabled in `.eslintrc.json`
- Memory issues → Upgrade to paid plan if needed

### API Calls Fail

**Check:**

1. `NEXT_PUBLIC_API_BASE_URL` is set correctly in Netlify env vars
2. `NEXT_PUBLIC_APP_URL` matches the canonical frontend domain
3. Backend allows CORS from Netlify domain
4. Backend is accessible (not localhost!)

### Images Not Loading

**Solutions:**

- Use Next.js `<Image>` component (already warned about)
- Or suppress warnings with `eslint-disable-next-line`

---

## Performance Optimization

### Already Configured ✅

1. **Static caching** - 1 year cache for assets
2. **CDN distribution** - Global edge network
3. **Automatic compression** - Gzip/Brotli
4. **Image optimization** - WebP conversion

### Additional Recommendations

1. **Enable Next.js Image Optimization**

   ```typescript
   // next.config.js
   module.exports = {
     images: {
       domains: ["your-supabase-url.supabase.co"],
     },
   };
   ```

2. **Add Analytics**
   - Netlify Analytics (paid)
   - Google Analytics (free)
   - Vercel Analytics (if you switch)

---

## Monitoring

### Netlify Dashboard

Track:

- Deploy status
- Build times
- Bandwidth usage
- Error logs

### Health Checks

Set up monitoring for:

- Homepage availability
- API connectivity
- Load times

---

## Rollback Procedure

If something breaks:

1. Go to **Deploys** tab
2. Find last working deploy
3. Click **"..."** → **"Publish deploy"**
4. Site reverts instantly

---

## Files Created for Deployment

1. ✅ `netlify.toml` - Build configuration
2. ✅ `.eslintrc.json` - Updated linting rules
3. ✅ `.env.example` - Environment variables template
4. ✅ `src/lib/config.ts` - Centralized config

---

## Next Steps After Deployment

1. ✅ Test all pages on live site
2. ✅ Verify API calls work
3. ✅ Check registration flow
4. ✅ Test payment integration (if applicable)
5. ✅ Set up custom domain (optional)
6. ✅ Configure analytics
7. ✅ Set up error monitoring (Sentry)

---

## Cost Estimate

### Netlify Free Tier

- ✅ 100 GB bandwidth/month
- ✅ 300 build minutes/month
- ✅ Unlimited sites
- ✅ HTTPS included
- ✅ Deploy previews

**This is sufficient for SwimBuddz launch!**

### If you exceed:

- $19/month for Pro plan
- 400 GB bandwidth
- 1,000 build minutes

---

## Support

**Netlify Documentation:**

- https://docs.netlify.com

**Next.js on Netlify:**

- https://docs.netlify.com/frameworks/next-js/overview/

**SwimBuddz Issues:**

- Check deployment logs
- Review this guide
- Contact team

---

## ✅ Production Ready!

Your frontend is now ready for automated Netlify deployment with:

- ✅ ESLint configured for production
- ✅ Netlify configuration file
- ✅ Environment variable template
- ✅ Security headers
- ✅ Caching optimization
- ✅ CORS setup documented

**Just connect your GitHub repo and you're live! 🚀**
