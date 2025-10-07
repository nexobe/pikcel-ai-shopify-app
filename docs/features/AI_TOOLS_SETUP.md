# AI Tools Page Setup Guide

## Overview

The AI Tools page displays all 34 AI-powered image editing tools from the PikcelAI platform, organized by category with search and filter capabilities.

## Implementation Details

### Files Created

1. **Type Definitions**: `/app/types/ai-models.ts`
   - TypeScript interfaces for AI models
   - Category types and filter types
   - Full type safety for PikcelAI API integration

2. **AI Tools Route**: `/app/routes/app.ai-tools.tsx`
   - Main AI Tools selection page
   - Loader function to fetch tools from PikcelAI API
   - Categorized grid layout with Polaris components
   - Search and filter functionality
   - Tool selection and navigation

3. **Navigation Update**: `/app/routes/app.tsx`
   - Added "AI Tools" link to app navigation

## Features

### 1. Tool Display
- **34 AI Tools** organized into 7 categories:
  - Content Generation (3 tools)
  - Product Enhancement (2 tools)
  - Fashion (3 tools)
  - Background (1 tool)
  - Design (13 tools)
  - Photography (11 tools)
  - Social Marketing (2 tools)

### 2. Search & Filter
- **Search**: Find tools by name, description, or category
- **Category Filter**: Filter by specific category or view all
- **Expandable Sections**: Show/hide tools by category
- **Results Count**: Real-time count of filtered results

### 3. Tool Cards
- **Preview Images**: Display tool preview images when available
- **Credit Badges**: Show credit cost prominently
- **Provider Info**: Display AI provider (Gemini, OpenAI, etc.)
- **Capabilities**: Show multi-image support, processing time
- **Pricing**: Display base price per tool
- **Select Button**: Navigate to editor with selected tool

### 4. Responsive Design
- **Grid Layout**: Auto-responsive 2-3-4 column grid
- **Mobile-Friendly**: Adapts to all screen sizes
- **Polaris Components**: Consistent Shopify design system

## Configuration

### Environment Variables

Add to your `.env` file or DigitalOcean environment:

```bash
# PikcelAI API endpoint
PIKCEL_API_URL=https://api.pikcel.ai

# Optional: API key if required
# PIKCEL_API_KEY=your_api_key_here
```

#### Local Development
```bash
# .env.local
PIKCEL_API_URL=http://localhost:8081
```

#### Production
```bash
# DigitalOcean or production environment
PIKCEL_API_URL=https://api.pikcel.ai
```

### Setting Environment Variables

#### Method 1: DigitalOcean Control Panel
1. Go to https://cloud.digitalocean.com/apps
2. Select your app
3. Settings → App-Level Environment Variables
4. Add `PIKCEL_API_URL` with value `https://api.pikcel.ai`
5. Click Save

#### Method 2: Using doctl CLI
```bash
doctl apps update YOUR_APP_ID \
  --env-vars "PIKCEL_API_URL=https://api.pikcel.ai"
```

#### Method 3: In app.yaml
Edit `.do/app.yaml`:
```yaml
envs:
  - key: PIKCEL_API_URL
    value: https://api.pikcel.ai
```

Then deploy:
```bash
doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

## API Integration

### PikcelAI API Endpoint

**Endpoint**: `GET /api/ai-models`

**URL**: `https://api.pikcel.ai/api/ai-models` (or your configured `PIKCEL_API_URL`)

**Response Format**:
```json
[
  {
    "id": "create-any-image",
    "name": "Create Any Image",
    "description": "Generate any image from text description",
    "provider": "gemini",
    "is_active": true,
    "category": "Content Generation",
    "credits_required": 3,
    "base_price": 0.50,
    "icon_name": "✨",
    "preview_image_url": "https://...",
    "preview_image_source": "pexels",
    "capabilities": {
      "multi_image": false,
      "batch_processing": false
    },
    "processing_time_estimate": 30,
    "supported_formats": ["image/jpeg", "image/png"],
    "output_formats": ["image/jpeg", "image/png"]
  }
]
```

### Error Handling

The page includes comprehensive error handling:
- API connection errors
- Empty results
- Invalid responses
- Network timeouts

Errors are displayed using Shopify Polaris Banner component.

## Usage

### Navigation

1. **Access AI Tools**: Click "AI Tools" in the app navigation
2. **Browse Tools**: View all tools organized by category
3. **Search**: Use the search bar to find specific tools
4. **Filter**: Select a category from the dropdown
5. **Expand/Collapse**: Control category visibility
6. **Select Tool**: Click "Select Tool" to navigate to editor

### Tool Selection Flow

1. User browses AI Tools page
2. User selects a tool
3. Tool data is stored in `sessionStorage`
4. User is navigated to `/app/editor?tool={toolId}`
5. Editor loads with selected tool context

## Next Steps

### To Complete the Integration

1. **Create Editor Route**: `/app/routes/app.editor.tsx`
   - Image upload interface
   - Tool parameter configuration
   - Processing and results display

2. **Implement Processing**:
   - Connect to PikcelAI job processing API
   - Handle file uploads
   - Display processing status
   - Show results

3. **Add Credits System**:
   - Display user credit balance
   - Handle credit purchases
   - Validate sufficient credits before processing

4. **Implement Job Management**:
   - Job history
   - Download results
   - Retry failed jobs

## Development

### Run Locally

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.digitalocean.example .env
# Edit .env and set PIKCEL_API_URL

# Start development server
npm run dev
```

### Test the Page

1. Start the app: `npm run dev`
2. Navigate to: http://localhost:3000/app/ai-tools
3. Verify tools are loaded from PikcelAI API
4. Test search and filter functionality
5. Test tool selection

## Troubleshooting

### Issue: No Tools Loading

**Solution**:
- Check `PIKCEL_API_URL` is set correctly
- Verify PikcelAI API is accessible
- Check browser console for errors
- Verify API endpoint returns data

### Issue: CORS Errors

**Solution**:
- Ensure PikcelAI API has CORS configured
- Add Shopify app domain to allowed origins
- Use server-side proxy if needed

### Issue: Navigation Not Working

**Solution**:
- Verify "AI Tools" link is in `/app/routes/app.tsx`
- Check route file is named correctly: `app.ai-tools.tsx`
- Clear browser cache and restart dev server

## Category Breakdown

### Content Generation (3 tools)
- Create Any Image - 3 credits
- Describe Any Change - 3 credits
- Miniature People - 3 credits

### Product Enhancement (2 tools)
- Product Beautifier - 2 credits
- Product Staging - 3 credits

### Fashion (3 tools)
- Virtual Model - 4 credits
- Flat Lay - 3 credits
- Ghost Mannequin - 4 credits

### Background (1 tool)
- Background Replacement - 2 credits

### Design (13 tools)
- Logo Design - 3 credits
- Text Design - 2 credits
- 3D Illustration - 3 credits
- Icon Design - 1 credit
- Coloring Page - 2 credits
- Product Packaging - 4 credits
- Various Cards (Christmas, Business, Gift, Birthday, Valentine) - 2 credits each
- Poster Design - 3 credits

### Photography (11 tools)
- Product Photography - 3 credits
- Architecture Photography - 3 credits
- People Photography - 3 credits
- Lifestyle Photography - 3 credits
- Landscape Photography - 3 credits
- Business Photography - 3 credits
- Food Photography - 3 credits
- Street Photography - 3 credits
- Sport Photography - 3 credits
- Animal Photography - 3 credits
- Wellness Photography - 3 credits

### Social Marketing (2 tools)
- Instagram Story - 2 credits
- Inspirational Quote - 2 credits

## Support

For issues or questions:
1. Check this documentation
2. Review PikcelAI API documentation
3. Check browser console for errors
4. Verify environment variables
5. Review server logs

## License

This implementation is part of the PikcelAI Shopify App.
