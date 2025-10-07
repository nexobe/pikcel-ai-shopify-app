# DigitalOcean Deployment Configuration

This directory contains configuration files for deploying the PikcelAI Shopify app to DigitalOcean App Platform.

## Files

### `app.yaml`
The main deployment configuration file. This is used to create and update your app on DigitalOcean.

**Usage:**
```bash
# Create new app
doctl apps create --spec .do/app.yaml

# Update existing app
doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

### `deploy.template.yaml`
A comprehensive template showing all available configuration options. Use this as a reference when customizing your deployment.

### `DEPLOYMENT.md`
Complete deployment guide with step-by-step instructions, troubleshooting, and best practices.

## Quick Start

### 1. Prerequisites
- DigitalOcean account
- GitHub repository connected
- Shopify app credentials
- doctl CLI installed (optional)

### 2. Configure
Edit `app.yaml`:
- Update `github.repo` with your repository
- Review instance sizes
- Configure environment variables

### 3. Deploy

**Option A: Using Control Panel (Easiest)**
1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App"
3. Connect GitHub repository
4. Follow the wizard

**Option B: Using doctl CLI**
```bash
# Authenticate
doctl auth init

# Create app
doctl apps create --spec .do/app.yaml
```

### 4. Set Environment Variables

After deployment, set these secrets:
- `SHOPIFY_API_KEY` - Your Shopify app key
- `SHOPIFY_API_SECRET` - Your Shopify app secret
- `SHOPIFY_APP_SESSION_SECRET` - Generate with: `openssl rand -base64 32`

## Important Notes

### Database Configuration
The template uses PostgreSQL. Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Port Configuration
DigitalOcean App Platform requires apps to listen on port **8080**. The configuration sets this automatically via the `PORT` environment variable.

### Health Check
Ensure your app has a `/healthz` endpoint that returns a 200 status code.

## Deployment Methods

### Method 1: Buildpack (Default)
Uses Node.js buildpack. Automatic detection and build.

```yaml
environment_slug: node-js
build_command: npm run build
run_command: npm start
```

### Method 2: Dockerfile
Uses the optimized Dockerfile in the repository.

```yaml
# Comment out environment_slug
# Uncomment:
dockerfile_path: Dockerfile
```

## Cost Estimate

### Development
- App: $5/month (basic-xxs)
- Database: $15/month (dev)
- **Total: ~$20/month**

### Production
- App: $12-25/month (basic-xs to basic-s)
- Database: $30-60/month (production tier)
- **Total: ~$42-85/month**

## Common Commands

```bash
# List apps
doctl apps list

# Get app details
doctl apps get YOUR_APP_ID

# View logs
doctl apps logs YOUR_APP_ID --type RUN --follow

# Update app
doctl apps update YOUR_APP_ID --spec .do/app.yaml

# Restart app
doctl apps restart YOUR_APP_ID
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SHOPIFY_API_KEY` | Yes | Shopify app API key |
| `SHOPIFY_API_SECRET` | Yes | Shopify app secret |
| `SHOPIFY_APP_SESSION_SECRET` | Yes | Session encryption (generate with openssl) |
| `DATABASE_URL` | Auto | Auto-set by DigitalOcean |
| `PORT` | Auto | Set to 8080 automatically |
| `NODE_ENV` | Auto | Set to production |

## Troubleshooting

### App won't start
- Check logs: `doctl apps logs YOUR_APP_ID --type RUN`
- Verify port 8080 is used
- Check environment variables are set

### Database connection fails
- Verify `DATABASE_URL` is set
- Check Prisma schema uses PostgreSQL
- Ensure migrations ran successfully

### Build fails
- Check build logs: `doctl apps logs YOUR_APP_ID --type BUILD`
- Verify all dependencies are in package.json
- Check Node.js version compatibility

## Next Steps

After deployment:
1. Get your app URL from DigitalOcean
2. Update Shopify app settings with the new URL
3. Add callback URLs in Shopify dashboard
4. Test the installation flow
5. Monitor logs for any issues

## Resources

- [Full Deployment Guide](./DEPLOYMENT.md)
- [Template Reference](./deploy.template.yaml)
- [DigitalOcean Docs](https://docs.digitalocean.com/products/app-platform/)
- [Shopify App Docs](https://shopify.dev/docs/apps)

---

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)
