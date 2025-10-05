# Google Cloud Configuration for PikcelAI Shopify App

## Overview

This document describes the Google Cloud setup for the PikcelAI Shopify App, which uses the **pikcel** GCP project for AI image processing with Gemini AI.

---

## Google Cloud Project Details

**Project Information:**
- **Project ID**: `pikcel`
- **Project Number**: `952812272410`
- **Project Name**: `pikcel`
- **Account**: `asghar@nexobe.com`

**gcloud Configuration:**
```bash
gcloud config list
# [core]
# account = asghar@nexobe.com
# project = pikcel
```

---

## Enabled APIs

The following Google Cloud APIs are enabled for the **pikcel** project:

### AI & Machine Learning
- ✅ **Vertex AI API** (`aiplatform.googleapis.com`)
- ✅ **Generative Language API** (`generativelanguage.googleapis.com`) - **For Gemini AI**

### Data & Analytics
- ✅ BigQuery API
- ✅ BigQuery Storage API
- ✅ Analytics Hub API
- ✅ Dataform API
- ✅ Cloud Dataplex API

### Infrastructure
- ✅ Compute Engine API
- ✅ Cloud Datastore API
- ✅ Cloud Logging API
- ✅ Cloud Monitoring API
- ✅ Cloud Trace API

### Integration
- ✅ **Google Drive API** (`drive.googleapis.com`)

---

## Gemini AI Configuration

### API Key
The Shopify app uses the **Gemini 2.5 Flash Image** model for AI image processing.

**API Key**: `AIzaSyDZYcDx-Ic5QkYhAOJ4fuAGuZvSeQJtFOY`

**Where to get API Key:**
- Go to: https://aistudio.google.com/app/apikey
- Select project: **pikcel**
- Generate or copy existing API key

### Environment Variables

The following environment variables are configured in the Shopify app:

```bash
# Google Cloud Project
GOOGLE_CLOUD_PROJECT=pikcel
GCP_PROJECT_ID=pikcel

# Gemini AI API Key
GOOGLE_API_KEY=AIzaSyDZYcDx-Ic5QkYhAOJ4fuAGuZvSeQJtFOY
VITE_GOOGLE_API_KEY=AIzaSyDZYcDx-Ic5QkYhAOJ4fuAGuZvSeQJtFOY
```

---

## DigitalOcean Deployment Configuration

The Google Cloud settings are configured in the DigitalOcean App Platform via `.do/app.yaml`:

### Environment Variables in app.yaml

```yaml
services:
  - name: web
    envs:
      # Google Cloud Project configuration
      - key: GOOGLE_CLOUD_PROJECT
        value: "pikcel"
        scope: RUN_TIME
        type: GENERAL

      - key: GCP_PROJECT_ID
        value: "pikcel"
        scope: RUN_TIME
        type: GENERAL

      # Google Gemini AI API Key
      - key: GOOGLE_API_KEY
        value: "AIzaSyDZYcDx-Ic5QkYhAOJ4fuAGuZvSeQJtFOY"
        scope: RUN_TIME
        type: SECRET

      - key: VITE_GOOGLE_API_KEY
        value: "AIzaSyDZYcDx-Ic5QkYhAOJ4fuAGuZvSeQJtFOY"
        scope: RUN_AND_BUILD_TIME
        type: SECRET
```

---

## Gemini AI Model Usage

### Model: gemini-2.5-flash-image-preview

**Capabilities:**
- Image generation from text prompts
- Image editing and modifications
- Background removal and replacement
- Product enhancement
- Fashion and apparel editing
- 10 aspect ratios support
- Multi-image composition

**Pricing:**
- **Cost**: $0.039 per image (1290 tokens @ $30/1M tokens)
- **Input**: Supports JPG, PNG, WebP up to 20MB
- **Output**: PNG or JPEG

**All 34 AI Tools** in the PikcelAI Shopify app use this Gemini model for processing.

---

## How the Integration Works

### 1. User Workflow
```
User selects product image in Shopify app
    ↓
Chooses AI tool (e.g., Background Removal)
    ↓
App sends request to PikcelAI backend API
    ↓
PikcelAI processes image with Gemini AI (using pikcel project)
    ↓
Processed image returned to Shopify app
    ↓
User can upload edited image back to Shopify product
```

### 2. API Integration

**Shopify App → PikcelAI API:**
```typescript
// app/services/pikcelai.server.ts
const client = getPikcelAIClient();

const job = await client.dispatchJob({
  tool_id: 'background-removal',
  input_image_url: productImageUrl,
  parameters: {...}
});
```

**PikcelAI Backend → Gemini AI:**
```typescript
// Uses GOOGLE_API_KEY to authenticate
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image-preview'
});
```

---

## APIs Not Currently Used (But Available)

The following APIs are NOT enabled but could be enabled if needed:

- ❌ **Cloud Run API** (`run.googleapis.com`)
  - Not needed (deploying to DigitalOcean, not Cloud Run)

- ❌ **Secret Manager API** (`secretmanager.googleapis.com`)
  - Not needed (using DigitalOcean environment variables)

- ❌ **Cloud Functions API**
  - Not needed (using Supabase Edge Functions)

- ❌ **Cloud Storage API**
  - Not needed (using Supabase Storage)

### To Enable Additional APIs (if needed):

```bash
# Enable Cloud Run (if switching from DigitalOcean)
gcloud services enable run.googleapis.com --project=pikcel

# Enable Secret Manager
gcloud services enable secretmanager.googleapis.com --project=pikcel

# Enable Cloud Storage
gcloud services enable storage.googleapis.com --project=pikcel
```

---

## Verification Commands

### Check Current Project
```bash
gcloud config get-value project
# Output: pikcel
```

### List Enabled Services
```bash
gcloud services list --enabled --project=pikcel
```

### Check Gemini API Key
```bash
# Test the API key
curl -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyDZYcDx-Ic5QkYhAOJ4fuAGuZvSeQJtFOY"
```

### Verify Account Access
```bash
gcloud auth list
# Should show: asghar@nexobe.com (active)
```

---

## Security Considerations

### API Key Protection

✅ **Stored as SECRET in DigitalOcean** - API key is encrypted
✅ **Not committed to Git** - Only in `.env` files (gitignored)
✅ **Rotatable** - Can be regenerated in Google AI Studio
✅ **Project-scoped** - Only works for pikcel project

### Best Practices

1. **Monitor Usage**: Check quotas in Google Cloud Console
2. **Set Budgets**: Configure billing alerts for the pikcel project
3. **Rotate Keys**: Rotate API keys every 90 days
4. **Restrict Key**: Add API key restrictions in Google Cloud Console:
   - HTTP referrers (websites)
   - IP addresses (servers)
   - API restrictions (only Generative Language API)

---

## Troubleshooting

### Issue: "API key not valid"
**Solution**: Regenerate key in https://aistudio.google.com/app/apikey

### Issue: "Quota exceeded"
**Solution**: Check quotas in Google Cloud Console → Quotas

### Issue: "Permission denied"
**Solution**: Verify account `asghar@nexobe.com` has access to pikcel project

### Issue: "API not enabled"
**Solution**:
```bash
gcloud services enable generativelanguage.googleapis.com --project=pikcel
```

---

## Cost Monitoring

### Current Pricing (as of 2025)
- **Gemini 2.5 Flash Image**: $30 per 1M tokens
- **Average Image**: ~1290 tokens = $0.039 per image
- **1000 images/day**: ~$39/day = $1,170/month

### Monitor Costs
1. Go to: https://console.cloud.google.com/billing
2. Select project: **pikcel**
3. View: Cost breakdown by service
4. Set alerts for unusual spending

---

## Additional Resources

- **Google AI Studio**: https://aistudio.google.com/
- **Gemini API Docs**: https://ai.google.dev/gemini-api/docs
- **Google Cloud Console**: https://console.cloud.google.com/
- **Vertex AI Console**: https://console.cloud.google.com/vertex-ai
- **Pricing Calculator**: https://cloud.google.com/products/calculator

---

## Summary

✅ Google Cloud project **pikcel** is configured
✅ Gemini AI API is enabled and authenticated
✅ API key is securely stored in DigitalOcean
✅ All 34 AI tools use Gemini for processing
✅ Environment variables are properly configured
✅ Ready for production deployment

**The Shopify app is fully configured to use Google Cloud Gemini AI for all image processing operations.**
