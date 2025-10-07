# DigitalOcean Deployment Setup Summary

This document summarizes all files created for DigitalOcean App Platform deployment.

## Files Created

### Configuration Files

1. **`.do/app.yaml`** - Main deployment configuration
   - Production-ready configuration
   - PostgreSQL database included
   - Environment variables defined
   - Health checks configured
   - Pre-deploy migration job

2. **`.do/deploy.template.yaml`** - Comprehensive reference template
   - All available configuration options
   - Detailed comments and examples
   - Different deployment scenarios

3. **`.do/DEPLOYMENT.md`** - Complete deployment guide
   - Step-by-step instructions
   - Three deployment methods
   - Troubleshooting section
   - Cost estimation
   - Common commands reference

4. **`.do/README.md`** - Quick start guide
   - Quick reference for common tasks
   - Environment variables reference
   - Cost estimates

5. **`.do/deploy.sh`** - Automated deployment script
   - Interactive deployment
   - Secrets management
   - Status checking
   - Log viewing

6. **`.env.digitalocean.example`** - Environment variables reference
   - All required variables documented
   - Security notes
   - Setup instructions

### Application Files

7. **`Dockerfile`** - Optimized for DigitalOcean
   - Multi-stage build (smaller image)
   - Node.js 20 Alpine
   - Non-root user for security
   - Port 8080 configured
   - Built-in health check

8. **`.dockerignore`** - Optimized Docker build
   - Excludes unnecessary files
   - Reduces build time and image size

9. **`app/routes/healthz.tsx`** - Health check endpoint
   - Required for DigitalOcean monitoring
   - Returns 200 OK when healthy

### CI/CD

10. **`.github/workflows/deploy-digitalocean.yml`** - GitHub Actions workflow
    - Automated deployment on push
    - Manual deployment trigger
    - Deployment status monitoring
    - Health check validation

## Pre-Deployment Checklist

Before deploying, complete these steps:

### 1. Update Configuration

- [ ] Edit `.do/app.yaml`
- [ ] Replace `YOUR_GITHUB_USERNAME` with your GitHub username
- [ ] Review instance sizes (app and database)
- [ ] Adjust region if needed (default: nyc)

### 2. Update Prisma Schema

Change `prisma/schema.prisma` from SQLite to PostgreSQL:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 3. Commit Changes

```bash
git add .
git commit -m "Add DigitalOcean deployment configuration"
git push origin main
```

### 4. Get Shopify Credentials

From [Shopify Partners Dashboard](https://partners.shopify.com/):
- Shopify API Key
- Shopify API Secret

### 5. Generate Session Secret

```bash
openssl rand -base64 32
```

Save this for later use.

## Deployment Options

### Option 1: DigitalOcean Control Panel (Easiest)

1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App"
3. Connect GitHub repository
4. Select `pikcel-ai-shopify-app` repository
5. Follow the wizard
6. Set environment secrets after deployment

**Best for:** First-time deployments, visual configuration

### Option 2: doctl CLI (Fastest)

```bash
# Install doctl
brew install doctl  # macOS
# or download from https://docs.digitalocean.com/reference/doctl/

# Authenticate
doctl auth init

# Create app
doctl apps create --spec .do/app.yaml

# Set secrets
doctl apps update YOUR_APP_ID \
  --env "SHOPIFY_API_KEY=your_key" \
  --env "SHOPIFY_API_SECRET=your_secret" \
  --env "SHOPIFY_APP_SESSION_SECRET=your_session_secret"
```

**Best for:** Automation, CI/CD, power users

### Option 3: Deployment Script (Interactive)

```bash
# Make executable (first time only)
chmod +x .do/deploy.sh

# Create app
.do/deploy.sh create

# Set up secrets
.do/deploy.sh setup-secrets

# Check status
.do/deploy.sh status

# View logs
.do/deploy.sh logs
```

**Best for:** Interactive deployment, beginners

### Option 4: GitHub Actions (Automated)

1. Add `DIGITALOCEAN_ACCESS_TOKEN` to GitHub Secrets
   - Go to repository Settings → Secrets and variables → Actions
   - Add new repository secret

2. Push to main branch
   ```bash
   git push origin main
   ```

3. GitHub Actions will automatically deploy

**Best for:** Continuous deployment, team collaboration

## Post-Deployment Steps

### 1. Get Your App URL

**Using doctl:**
```bash
doctl apps list
# Find your app ID, then:
doctl apps get YOUR_APP_ID --format LiveURL --no-header
```

**Using Control Panel:**
- Go to your app in DigitalOcean
- Copy the Live URL

### 2. Update Shopify App Settings

1. Go to Shopify Partners Dashboard
2. Navigate to your app
3. Update these URLs:
   - **App URL**: `https://your-app.ondigitalocean.app`
   - **Allowed redirection URL(s)**:
     - `https://your-app.ondigitalocean.app/shopify/callback`
     - `https://your-app.ondigitalocean.app/auth/callback`

### 3. Test the Installation

1. Visit your app URL
2. Install on a test store
3. Verify OAuth flow works
4. Check database connectivity

### 4. Monitor the Deployment

```bash
# View real-time logs
.do/deploy.sh logs

# Or with doctl
doctl apps logs YOUR_APP_ID --type RUN --follow
```

## Environment Variables Reference

Set these in DigitalOcean after deployment:

| Variable | Required | How to Get | Example |
|----------|----------|------------|---------|
| `SHOPIFY_API_KEY` | ✓ | Shopify Partners Dashboard | `7ef5a5c004e74a46...` |
| `SHOPIFY_API_SECRET` | ✓ | Shopify Partners Dashboard | `shpss_xxxxx...` |
| `SHOPIFY_APP_SESSION_SECRET` | ✓ | `openssl rand -base64 32` | `random_base64_string` |
| `DATABASE_URL` | Auto | Auto-set by DigitalOcean | `postgresql://...` |
| `PORT` | Auto | Auto-set to 8080 | `8080` |
| `NODE_ENV` | Auto | Auto-set to production | `production` |

## Architecture Overview

```
┌─────────────────────────────────────────┐
│    DigitalOcean App Platform            │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   Web Service (Node.js 20)       │  │
│  │   - Port: 8080                   │  │
│  │   - Instance: basic-xxs          │  │
│  │   - Auto-deploy: enabled         │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   PostgreSQL Database (v16)      │  │
│  │   - Size: db-s-dev-database      │  │
│  │   - Connection: ${db.DATABASE_URL}│ │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   Pre-Deploy Job                 │  │
│  │   - Runs: npm run setup          │  │
│  │   - Prisma migrations            │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   Health Check                   │  │
│  │   - Endpoint: /healthz           │  │
│  │   - Interval: 10s                │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│         Shopify Platform                │
│   - OAuth callbacks                     │
│   - Webhooks                            │
│   - GraphQL API                         │
└─────────────────────────────────────────┘
```

## Build Process

1. **Source Code**: GitHub → DigitalOcean
2. **Dependencies**: `npm ci` installs packages
3. **Build**: `npm run build` compiles app
4. **Migrations**: `npm run setup` runs Prisma migrations
5. **Start**: `npm start` launches server on port 8080
6. **Health Check**: `/healthz` endpoint monitored

## Cost Breakdown

### Development (Minimal)
- **App**: basic-xxs ($5/month)
- **Database**: db-s-dev-database ($15/month)
- **Bandwidth**: Free (1TB included)
- **Total**: **$20/month**

### Production (Recommended)
- **App**: basic-xs ($12/month)
- **Database**: db-s-1vcpu-2gb ($30/month)
- **Backups**: Included
- **Total**: **$42/month**

### Scale (High Traffic)
- **App**: basic-s × 2 instances ($50/month)
- **Database**: db-s-2vcpu-4gb ($60/month)
- **Total**: **$110/month**

## Troubleshooting Quick Reference

### Issue: Build Fails

```bash
# View build logs
.do/deploy.sh logs build

# Common fixes:
# - Check package.json dependencies
# - Verify Node.js version (>= 20.10)
# - Clear build cache in DigitalOcean
```

### Issue: Database Connection Error

```bash
# Check if DATABASE_URL is set
doctl apps list-env-vars YOUR_APP_ID

# Verify Prisma schema uses postgresql
# Run migrations manually if needed
```

### Issue: Health Check Failing

```bash
# Test health endpoint
curl https://your-app.ondigitalocean.app/healthz

# Check if app listens on port 8080
# Verify /healthz route exists
```

### Issue: OAuth Redirect Error

```bash
# Verify these match in Shopify dashboard:
# - App URL: https://your-app.ondigitalocean.app
# - Callback URL: https://your-app.ondigitalocean.app/shopify/callback
```

## Useful Commands

```bash
# Deploy
.do/deploy.sh create                    # First deployment
.do/deploy.sh update                    # Update configuration
.do/deploy.sh setup-secrets            # Configure secrets

# Monitor
.do/deploy.sh status                   # Check status
.do/deploy.sh logs                     # View logs
.do/deploy.sh logs build               # Build logs

# Manage (with doctl)
doctl apps list                        # List all apps
doctl apps get YOUR_APP_ID             # App details
doctl apps restart YOUR_APP_ID         # Restart app
```

## Next Steps

1. **Deploy**: Choose a deployment method above
2. **Configure**: Set environment variables
3. **Update Shopify**: Add your app URL
4. **Test**: Install on a test store
5. **Monitor**: Watch logs for issues
6. **Scale**: Upgrade instances as needed

## Support

- **Documentation**: See `.do/DEPLOYMENT.md` for detailed guide
- **Template**: See `.do/deploy.template.yaml` for all options
- **DigitalOcean Docs**: https://docs.digitalocean.com/products/app-platform/
- **Shopify Docs**: https://shopify.dev/docs/apps

---

**Ready to deploy?** Start with: `.do/deploy.sh create`
