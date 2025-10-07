# PikcelAI Shopify App

AI-powered image editing and enhancement Shopify app built with React Router, integrating with the PikcelAI backend for advanced image processing capabilities.

## Quick Start

### Prerequisites

1. **Node.js**: [Download and install](https://nodejs.org/en/download/)
2. **Shopify Partner Account**: [Create an account](https://partners.shopify.com/signup)
3. **Test Store**: Set up a [development store](https://help.shopify.com/en/partners/dashboard/development-stores#create-a-development-store)
4. **Shopify CLI**: Install globally
```shell
npm install -g @shopify/cli@latest
```

### Setup

1. **Install dependencies**
```shell
npm install
```

2. **Configure environment variables**
Copy `.env.example` to `.env` and configure:
- Shopify API credentials
- PikcelAI backend URL and API key
- Supabase database credentials
- Google Cloud API keys

3. **Set up database**
```shell
npx prisma generate
npx prisma migrate deploy
```

4. **Start development**
```shell
shopify app dev
```

## Documentation

### 📚 Setup & Configuration
- [Supabase Setup](docs/setup/SUPABASE_SETUP.md) - Database configuration
- [Supabase Quickstart](docs/setup/SUPABASE_QUICKSTART.md) - Quick database setup guide
- [Google Cloud Setup](docs/setup/GOOGLE_CLOUD_SETUP.md) - Google Cloud configuration
- [PikcelAI Service Implementation](docs/setup/PIKCELAI_SERVICE_IMPLEMENTATION.md) - API service layer setup
- [Integration Guide](docs/setup/INTEGRATION_GUIDE.md) - Complete integration guide
- [Quickstart](docs/setup/QUICKSTART.md) - General quickstart guide

### ✨ Features
- [AI Tools Implementation](docs/features/AI_TOOLS_IMPLEMENTATION.md) - AI-powered image editing tools
- [AI Tools Setup](docs/features/AI_TOOLS_SETUP.md) - Setting up AI tools
- [AI Tools Quickstart](docs/features/AI_TOOLS_QUICKSTART.md) - Quick start for AI features
- [AI Tools Testing](docs/features/AI_TOOLS_TESTING_CHECKLIST.md) - Testing checklist
- [AI Editor Complete](docs/features/AI_EDITOR_COMPLETE.md) - Complete editor guide
- [Editor Implementation](docs/features/EDITOR_IMPLEMENTATION.md) - Editor setup details
- [Editor Flow Diagram](docs/features/EDITOR_FLOW_DIAGRAM.md) - Visual workflow
- [Editor Quickstart](docs/features/EDITOR_QUICKSTART.md) - Quick editor setup
- [Job Tracking](docs/features/JOB_TRACKING_SUMMARY.md) - Background job tracking
- [Job Tracking Setup](docs/features/JOB_TRACKING_SETUP.md) - Setup guide
- [Job Tracking Quickstart](docs/features/JOB_TRACKING_QUICKSTART.md) - Quick setup
- [Products Feature](docs/features/PRODUCTS_FEATURE.md) - Product management features
- [Products Implementation](docs/features/PRODUCTS_IMPLEMENTATION_SUMMARY.md) - Implementation details
- [Templates Feature](docs/features/TEMPLATES_FEATURE.md) - Image templates
- [Templates Implementation](docs/features/TEMPLATES_IMPLEMENTATION_SUMMARY.md) - Template system details
- [Shopify Upload](docs/features/SHOPIFY_UPLOAD.md) - Upload to Shopify guide
- [Shopify Upload Quickstart](docs/features/SHOPIFY_UPLOAD_QUICKSTART.md) - Quick upload setup
- [Shopify Upload Examples](docs/features/SHOPIFY_UPLOAD_EXAMPLES.md) - Code examples

### 🏗️ Architecture
- [Products Architecture](docs/architecture/PRODUCTS_ARCHITECTURE.md) - System architecture
- [Integration Plan](docs/architecture/INTEGRATION_PLAN.md) - Integration strategy
- [Integration Flows](docs/architecture/INTEGRATION_FLOWS.md) - Data flow diagrams
- [Shopify Upload Implementation](docs/architecture/SHOPIFY_UPLOAD_IMPLEMENTATION.md) - Upload system architecture
- [Files Created](docs/architecture/FILES_CREATED.md) - Project file structure

### 🚀 Deployment
- [Deployment Guide](docs/deployment/DEPLOYMENT.md) - Deployment instructions
- [Deployment Setup](docs/deployment/SETUP_SUMMARY.md) - Setup summary
- [Deployment README](docs/deployment/README.md) - Deployment overview

## Tech Stack

- **Frontend**: React Router, Polaris (Shopify's design system)
- **Backend**: Node.js with React Router server
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **AI Integration**: PikcelAI Backend API, Google Gemini AI
- **Deployment**: DigitalOcean App Platform

## Core Features

### 🎨 AI-Powered Image Editing
- Background removal
- Object removal/inpainting
- Image enhancement
- Style transfer
- Text-to-image generation
- Image upscaling

### 📦 Product Management
- Bulk product image processing
- Template-based image generation
- Image variant management
- Automatic Shopify sync

### 🔄 Job Tracking
- Real-time processing status
- Progress monitoring
- Error handling and retry logic
- Webhook notifications

### 📝 Template System
- Pre-designed image templates
- Custom template creation
- Batch processing with templates

## Project Structure

```
├── app/
│   ├── routes/           # React Router routes
│   ├── services/         # API service layer
│   ├── components/       # React components
│   └── data/            # Data access layer
├── docs/                # Documentation
│   ├── setup/          # Setup guides
│   ├── features/       # Feature documentation
│   ├── architecture/   # Architecture docs
│   └── deployment/     # Deployment guides
├── prisma/             # Database schema
└── public/             # Static assets
```

## Development

### Running Tests
```shell
npm test
```

### Building for Production
```shell
npm run build
```

### Database Migrations
```shell
npx prisma migrate dev
```

## Environment Variables

Required environment variables:

```env
# Shopify
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SCOPES=read_products,write_products,read_files,write_files

# PikcelAI Backend
PIKCEL_API_URL=http://localhost:8081
PIKCEL_API_KEY=your_api_key

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Google Cloud
GOOGLE_CLOUD_PROJECT=your_project
GOOGLE_API_KEY=your_api_key
```

## Resources

- [Shopify App Documentation](https://shopify.dev/docs/apps)
- [React Router Documentation](https://reactrouter.com/)
- [Polaris Design System](https://polaris.shopify.com/)
- [PikcelAI Documentation](https://pikcel.ai/docs)
- [Supabase Documentation](https://supabase.com/docs)

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Proprietary - All rights reserved

## Support

For support, contact [support@pikcel.ai](mailto:support@pikcel.ai)
