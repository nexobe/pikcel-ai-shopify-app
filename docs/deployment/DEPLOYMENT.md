# DigitalOcean App Platform Deployment Guide
## PikcelAI Shopify App

This guide provides step-by-step instructions for deploying the PikcelAI Shopify app to DigitalOcean App Platform.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment Methods](#deployment-methods)
3. [Initial Setup](#initial-setup)
4. [Configuration](#configuration)
5. [Deployment](#deployment)
6. [Post-Deployment](#post-deployment)
7. [Environment Variables](#environment-variables)
8. [Database Management](#database-management)
9. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
10. [Cost Estimation](#cost-estimation)

---

## Prerequisites

Before deploying, ensure you have:

- **DigitalOcean Account**: [Sign up here](https://cloud.digitalocean.com/registrations/new)
- **GitHub Account**: Repository must be accessible to DigitalOcean
- **Shopify Partner Account**: With app credentials
- **doctl CLI** (optional): [Installation guide](https://docs.digitalocean.com/reference/doctl/how-to/install/)
- **Node.js 20+**: For local development and testing

---

## Deployment Methods

### Method 1: Using DigitalOcean Control Panel (Recommended for first-time)

This is the easiest method and requires no CLI installation.

**Steps:**

1. Log in to [DigitalOcean](https://cloud.digitalocean.com/)
2. Navigate to **Apps** in the sidebar
3. Click **Create App**
4. Choose **GitHub** as the source
5. Authorize DigitalOcean to access your repository
6. Select your repository: `pikcel-ai-shopify-app`
7. Select branch: `main`
8. Review detected resources (should detect Node.js app)
9. Configure as described in [Configuration](#configuration)
10. Click **Next** through the wizard
11. Review and **Create Resources**

### Method 2: Using doctl CLI (Recommended for automation)

**Steps:**

1. Install doctl:
   ```bash
   # macOS
   brew install doctl

   # Linux
   cd ~
   wget https://github.com/digitalocean/doctl/releases/download/v1.104.0/doctl-1.104.0-linux-amd64.tar.gz
   tar xf ~/doctl-1.104.0-linux-amd64.tar.gz
   sudo mv ~/doctl /usr/local/bin
   ```

2. Authenticate with DigitalOcean:
   ```bash
   doctl auth init
   ```
   Enter your API token when prompted. Get one from: https://cloud.digitalocean.com/account/api/tokens

3. Update `.do/app.yaml` with your repository details:
   ```yaml
   github:
     repo: YOUR_GITHUB_USERNAME/pikcel-ai-shopify-app
     branch: main
   ```

4. Create the app:
   ```bash
   doctl apps create --spec .do/app.yaml
   ```

5. Get your app ID:
   ```bash
   doctl apps list
   ```

### Method 3: Using Dockerfile (Alternative)

If you prefer Docker-based deployments:

1. In `.do/app.yaml`, comment out `environment_slug: node-js`
2. Uncomment `dockerfile_path: Dockerfile`
3. Deploy using either Method 1 or Method 2

---

## Initial Setup

### 1. Prepare Your Repository

Ensure your repository has:

```
pikcel-ai-shopify-app/
├── .do/
│   ├── app.yaml              # Main deployment config
│   ├── deploy.template.yaml  # Reference template
│   └── DEPLOYMENT.md         # This file
├── Dockerfile                # Optimized for DigitalOcean
├── package.json
├── prisma/
│   └── schema.prisma
└── ... (rest of your app)
```

### 2. Update Prisma Schema for PostgreSQL

The app template uses SQLite by default, but DigitalOcean uses PostgreSQL. Update `prisma/schema.prisma`:

**Before:**
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:dev.sqlite"
}
```

**After:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 3. Commit and Push Changes

```bash
git add .
git commit -m "Configure for DigitalOcean deployment"
git push origin main
```

---

## Configuration

### Edit `.do/app.yaml`

1. **Update GitHub repository:**
   ```yaml
   github:
     repo: YOUR_GITHUB_USERNAME/pikcel-ai-shopify-app
   ```

2. **Review instance size:**
   - Development: `basic-xxs` ($5/month)
   - Production: `basic-xs` ($12/month) or higher

3. **Configure database:**
   - Development: `db-s-dev-database` ($15/month)
   - Production: Consider `db-s-1vcpu-2gb` ($30/month) for better performance

---

## Deployment

### Initial Deployment

Using doctl:
```bash
doctl apps create --spec .do/app.yaml
```

Using Control Panel:
- Follow Method 1 steps above

### Update Existing App

```bash
# Get app ID
doctl apps list

# Update app
doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

### Monitor Deployment

```bash
# View app info
doctl apps get YOUR_APP_ID

# View deployment logs
doctl apps logs YOUR_APP_ID --type BUILD
doctl apps logs YOUR_APP_ID --type DEPLOY
doctl apps logs YOUR_APP_ID --type RUN
```

---

## Post-Deployment

### 1. Set Environment Variables

**Using doctl:**

```bash
# Set Shopify credentials
doctl apps update YOUR_APP_ID --spec .do/app.yaml

# Or update individual variables
doctl apps update YOUR_APP_ID \
  --env-vars "SHOPIFY_API_KEY=your_key_here,SHOPIFY_API_SECRET=your_secret_here"
```

**Using Control Panel:**

1. Go to your app in DigitalOcean
2. Navigate to **Settings** → **App-Level Environment Variables**
3. Click **Edit** and add:
   - `SHOPIFY_API_KEY`: Your Shopify app key
   - `SHOPIFY_API_SECRET`: Your Shopify app secret
   - `SHOPIFY_APP_SESSION_SECRET`: Generate with `openssl rand -base64 32`
4. Click **Save**

### 2. Get Your App URL

```bash
doctl apps get YOUR_APP_ID | grep "Live URL"
```

Or find it in the DigitalOcean control panel.

### 3. Update Shopify App Settings

1. Go to [Shopify Partners Dashboard](https://partners.shopify.com/)
2. Navigate to your app
3. Update **App URL**: `https://your-app.ondigitalocean.app`
4. Update **Allowed redirection URL(s)**:
   ```
   https://your-app.ondigitalocean.app/shopify/callback
   https://your-app.ondigitalocean.app/auth/callback
   ```

### 4. Verify Health Check

```bash
curl https://your-app.ondigitalocean.app/healthz
```

Should return a success response.

---

## Environment Variables

### Required Variables

| Variable | Type | Description | How to Set |
|----------|------|-------------|------------|
| `SHOPIFY_API_KEY` | SECRET | Shopify app API key | Control Panel or doctl |
| `SHOPIFY_API_SECRET` | SECRET | Shopify app secret | Control Panel or doctl |
| `SHOPIFY_APP_SESSION_SECRET` | SECRET | Session encryption key | Generate: `openssl rand -base64 32` |
| `DATABASE_URL` | AUTO | PostgreSQL connection string | Auto-set by DigitalOcean |

### Optional Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PORT` | GENERAL | `8080` | Server port (DigitalOcean requires 8080) |
| `NODE_ENV` | GENERAL | `production` | Node.js environment |
| `SHOPIFY_SCOPES` | GENERAL | See below | App permissions |

### Default Shopify Scopes

```
read_products,write_products,read_files,write_files
```

Modify in `.do/app.yaml` if you need additional permissions.

### Generate Session Secret

```bash
openssl rand -base64 32
```

Copy the output and set it as `SHOPIFY_APP_SESSION_SECRET`.

---

## Database Management

### View Database Connection Info

```bash
doctl databases list
doctl databases connection YOUR_DB_ID
```

### Run Migrations

Migrations run automatically during deployment via the `db-migrate` job.

To run manually:

```bash
# SSH into app container (if needed)
doctl apps exec YOUR_APP_ID npm run setup
```

### Backup Database

DigitalOcean provides automatic backups (requires paid plan).

Manual backup:
```bash
# Get database connection info
doctl databases connection YOUR_DB_ID --format ConnectionString

# Use pg_dump
pg_dump "postgresql://user:pass@host:port/dbname" > backup.sql
```

### Connect to Database

```bash
# Get connection string
doctl databases connection YOUR_DB_ID

# Connect with psql
psql "postgresql://user:pass@host:port/dbname"
```

---

## Monitoring & Troubleshooting

### View Logs

**Real-time logs:**
```bash
doctl apps logs YOUR_APP_ID --type RUN --follow
```

**Build logs:**
```bash
doctl apps logs YOUR_APP_ID --type BUILD
```

**Deployment logs:**
```bash
doctl apps logs YOUR_APP_ID --type DEPLOY
```

**Using Control Panel:**
1. Go to your app
2. Click **Runtime Logs**, **Build Logs**, or **Deploy Logs**

### Common Issues

#### 1. Port Configuration Error

**Error:** App doesn't respond / health check fails

**Solution:** Ensure your app listens on port 8080:
```javascript
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

#### 2. Database Connection Error

**Error:** `Connection refused` or `Database not found`

**Solution:**
- Check DATABASE_URL is set: `doctl apps list-env-vars YOUR_APP_ID`
- Verify Prisma schema uses PostgreSQL
- Run migrations: App should auto-run `npm run setup`

#### 3. Build Failures

**Error:** Build fails during `npm run build`

**Solution:**
- Check build logs: `doctl apps logs YOUR_APP_ID --type BUILD`
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility (`node >= 20.10`)

#### 4. Shopify Auth Errors

**Error:** OAuth redirect fails

**Solution:**
- Verify callback URLs in Shopify dashboard match your app URL
- Ensure `SHOPIFY_APP_URL` environment variable is set correctly
- Check `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are set

### Health Check Endpoint

Create `/app/routes/healthz.tsx` (if not exists):

```typescript
import type { LoaderFunctionArgs } from "@react-router/node";

export async function loader({ request }: LoaderFunctionArgs) {
  return new Response("OK", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
```

### Enable Debug Logging

Add to environment variables:
```yaml
- key: DEBUG
  value: "shopify:*"
  scope: RUN_TIME
  type: GENERAL
```

---

## Cost Estimation

### Monthly Costs (USD)

#### Development/Testing
- **App Instance (basic-xxs)**: $5/month
- **Database (db-s-dev-database)**: $15/month
- **Total**: ~$20/month

#### Small Production
- **App Instance (basic-xs)**: $12/month
- **Database (db-s-1vcpu-2gb)**: $30/month
- **Total**: ~$42/month

#### Medium Production
- **App Instance (basic-s)**: $25/month
- **Database (db-s-2vcpu-4gb)**: $60/month
- **Backups**: Included with paid database
- **Total**: ~$85/month

#### Enterprise Production
- **App Instance (professional-xs)**: $50/month
- **Database (db-s-4vcpu-8gb)**: $120/month
- **Multiple instances (3x)**: $150/month
- **Total**: ~$270/month

### Additional Costs
- **Bandwidth**: Free (1TB included)
- **Custom Domains**: Free
- **SSL Certificates**: Free (auto-managed)

### Cost Optimization Tips

1. **Start small**: Use `basic-xxs` and `db-s-dev-database` initially
2. **Monitor usage**: Check metrics before scaling up
3. **Scale horizontally**: Add instances only when needed
4. **Use connection pooling**: Reduce database connections
5. **Enable caching**: Reduce database queries

---

## Advanced Configuration

### Custom Domain

1. Add domain in DigitalOcean:
   ```bash
   doctl apps update YOUR_APP_ID --domain app.pikcel.ai
   ```

2. Update DNS records (DigitalOcean provides instructions)

3. Update Shopify app settings with new domain

### Auto-Scaling (Professional tier)

Add to `.do/app.yaml`:
```yaml
services:
  - name: web
    autoscaling:
      min_instance_count: 1
      max_instance_count: 5
      metrics:
        cpu:
          percent: 80
```

### Connection Pooling

Add to `.do/app.yaml`:
```yaml
databases:
  - name: db
    connection_pool:
      name: pool
      mode: transaction
      size: 20
```

Update DATABASE_URL to use pool:
```yaml
envs:
  - key: DATABASE_URL
    value: ${db.pool.DATABASE_URL}
```

### CORS Configuration

Add to `.do/app.yaml`:
```yaml
services:
  - name: web
    cors:
      allow_origins:
        - prefix: https://
          regex: .*\.myshopify\.com$
      allow_methods:
        - GET
        - POST
        - PUT
        - DELETE
        - OPTIONS
      allow_credentials: true
```

---

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to DigitalOcean

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

      - name: Update app
        run: |
          doctl apps update ${{ secrets.APP_ID }} --spec .do/app.yaml
```

Set secrets in GitHub:
- `DIGITALOCEAN_ACCESS_TOKEN`
- `APP_ID`

---

## Security Best Practices

1. **Use environment variables** for all secrets
2. **Enable HTTPS** (automatic on DigitalOcean)
3. **Regular updates**: Keep dependencies updated
4. **Database backups**: Enable automatic backups
5. **Monitor logs**: Set up alerts for errors
6. **Least privilege**: Use minimal database permissions
7. **Rate limiting**: Implement in your app
8. **Input validation**: Sanitize all user inputs

---

## Support & Resources

### Documentation
- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [App Spec Reference](https://docs.digitalocean.com/products/app-platform/reference/app-spec/)
- [Shopify App Development](https://shopify.dev/docs/apps)

### Community
- [DigitalOcean Community](https://www.digitalocean.com/community)
- [Shopify Dev Forums](https://community.shopify.com/)

### Support
- DigitalOcean Support: support@digitalocean.com
- [Create Support Ticket](https://cloud.digitalocean.com/support/tickets/new)

---

## Quick Reference Commands

```bash
# List apps
doctl apps list

# Get app details
doctl apps get YOUR_APP_ID

# View logs
doctl apps logs YOUR_APP_ID --type RUN --follow

# Update app
doctl apps update YOUR_APP_ID --spec .do/app.yaml

# List databases
doctl databases list

# Get database connection
doctl databases connection YOUR_DB_ID

# Restart app
doctl apps restart YOUR_APP_ID

# Delete app
doctl apps delete YOUR_APP_ID
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Updated Prisma schema to use PostgreSQL
- [ ] Committed all changes to Git
- [ ] Updated `.do/app.yaml` with correct repository
- [ ] Generated session secret (`openssl rand -base64 32`)
- [ ] Have Shopify API credentials ready
- [ ] Configured database size appropriately
- [ ] Set up monitoring/alerts
- [ ] Tested health check endpoint
- [ ] Configured custom domain (if needed)
- [ ] Reviewed security settings
- [ ] Documented environment variables
- [ ] Set up backups (if using paid plan)

---

**Last Updated**: October 2025
**App Version**: 1.0.0
**Platform**: DigitalOcean App Platform
