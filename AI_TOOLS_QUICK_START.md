# AI Tools Page - Quick Start Guide

## What Was Created

### 1. TypeScript Types
**File**: `/app/types/ai-models.ts`

Defines interfaces for:
- `AIModel` - Complete AI tool/model structure
- `AIToolCategory` - 7 categories (Content Generation, Product Enhancement, Fashion, Background, Design, Photography, Social Marketing)
- `CategoryGroup` - Grouped tools by category
- `ToolFilters` - Search and filter state

### 2. AI Tools Page
**File**: `/app/routes/app.ai-tools.tsx`

Features:
- Fetches 34 AI tools from PikcelAI API
- Categorized display with 7 sections
- Search by name/description/category
- Filter by category dropdown
- Expand/collapse category sections
- Responsive grid layout (2-3-4 columns)
- Tool preview images with credit badges
- Provider badges (Gemini, OpenAI, etc.)
- Multi-image capability badges
- Processing time estimates
- "Select Tool" button → navigates to editor

### 3. Navigation Update
**File**: `/app/routes/app.tsx`

Added "AI Tools" link to navigation menu

### 4. Configuration
**File**: `.env.digitalocean.example`

Added `PIKCEL_API_URL` configuration

### 5. Documentation
**File**: `AI_TOOLS_SETUP.md`

Complete setup and usage guide

## Setup in 3 Steps

### Step 1: Set Environment Variable

Add to your environment:

```bash
# Local development (.env)
PIKCEL_API_URL=http://localhost:8081

# Production (DigitalOcean or .env.production)
PIKCEL_API_URL=https://api.pikcel.ai
```

**DigitalOcean Setup**:
```bash
doctl apps update YOUR_APP_ID \
  --env-vars "PIKCEL_API_URL=https://api.pikcel.ai"
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Run the App

```bash
npm run dev
```

Navigate to: `http://localhost:3000/app/ai-tools`

## How It Works

### Data Flow

```
1. User visits /app/ai-tools
   ↓
2. Loader fetches from ${PIKCEL_API_URL}/api/ai-models
   ↓
3. 34 tools grouped into 7 categories
   ↓
4. User searches/filters tools
   ↓
5. User selects a tool
   ↓
6. Tool data stored in sessionStorage
   ↓
7. Navigate to /app/editor?tool={toolId}
```

### API Response Format

```typescript
{
  id: string,                    // "create-any-image"
  name: string,                  // "Create Any Image"
  description: string,           // Tool description
  provider: string,              // "gemini"
  category: AIToolCategory,      // "Content Generation"
  credits_required: number,      // 3
  base_price: number,            // 0.50
  icon_name: string,             // "✨"
  preview_image_url?: string,    // Preview image URL
  capabilities?: {
    multi_image?: boolean,
    batch_processing?: boolean
  },
  processing_time_estimate?: number  // 30 seconds
}
```

## Categories Overview

| Category | Tools | Credit Range |
|----------|-------|--------------|
| Content Generation | 3 | 3 credits |
| Product Enhancement | 2 | 2-3 credits |
| Fashion | 3 | 3-4 credits |
| Background | 1 | 2 credits |
| Design | 13 | 1-4 credits |
| Photography | 11 | 3 credits |
| Social Marketing | 2 | 2 credits |

**Total**: 34 AI tools

## Key Features

### 1. Search
- Real-time search across tool names, descriptions, and categories
- Clear button to reset search
- Shows filtered count

### 2. Category Filter
- Dropdown with all 7 categories
- Shows tool count per category
- "All Categories" option

### 3. Expand/Collapse
- Expand All / Collapse All buttons
- Individual category toggle
- Remembers state during filtering

### 4. Tool Cards
- **Preview Image**: Visual representation (if available)
- **Credit Badge**: Prominent display in top-right
- **Tool Name**: Clear heading
- **Description**: What the tool does
- **Badges**:
  - Credits required
  - Provider (Gemini, OpenAI, etc.)
  - Multi-image capability
- **Pricing**: Base price display
- **Action**: "Select Tool" button

### 5. Sidebar Info
- Total tools count
- Categories count
- Available providers
- Credit range (min-max)
- Getting started guide

## Responsive Design

- **Desktop (1200px+)**: 4 columns
- **Tablet (768px-1199px)**: 3 columns
- **Mobile (320px-767px)**: 2 columns
- **Small Mobile (<320px)**: 1 column

Auto-responsive with CSS Grid:
```css
grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))
```

## Next Steps

### 1. Create Editor Page

```typescript
// app/routes/app.editor.tsx
export default function EditorPage() {
  const [searchParams] = useSearchParams();
  const toolId = searchParams.get('tool');

  // Load tool from sessionStorage
  const tool = JSON.parse(
    sessionStorage.getItem('selectedAITool') || '{}'
  );

  // Build editor UI
}
```

### 2. Implement Image Processing

- Connect to PikcelAI job processing API
- Handle file uploads
- Show processing progress
- Display results

### 3. Add Credits System

- Fetch user credit balance
- Display in header
- Validate before processing
- Handle credit purchases

### 4. Job Management

- Job history page
- Download results
- Retry failed jobs
- Delete old jobs

## Testing Checklist

- [ ] Page loads at `/app/ai-tools`
- [ ] 34 tools are displayed
- [ ] 7 categories are shown
- [ ] Search filters tools correctly
- [ ] Category filter works
- [ ] Expand/collapse functions
- [ ] Tool cards display all info
- [ ] Preview images load (if available)
- [ ] "Select Tool" navigates correctly
- [ ] Responsive on mobile
- [ ] Error handling shows banner
- [ ] No console errors

## Common Issues

### Issue: `PIKCEL_API_URL is not defined`
**Fix**: Set environment variable in `.env` file

### Issue: CORS errors
**Fix**: Configure PikcelAI API to allow Shopify app domain

### Issue: No tools loading
**Fix**: Check PikcelAI API is running and accessible

### Issue: Polaris components not rendering
**Fix**: Ensure `@shopify/polaris-types` is installed

## File Structure

```
pikcel-ai-shopify-app/
├── app/
│   ├── routes/
│   │   ├── app.tsx                    # Updated navigation
│   │   └── app.ai-tools.tsx           # AI Tools page
│   └── types/
│       └── ai-models.ts               # TypeScript types
├── .env.digitalocean.example          # Updated with PIKCEL_API_URL
├── AI_TOOLS_SETUP.md                  # Detailed setup guide
└── AI_TOOLS_QUICK_START.md           # This file
```

## Component Breakdown

### Loader Function
```typescript
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const response = await fetch(`${PIKCEL_API_URL}/api/ai-models`);
  const models: AIModel[] = await response.json();

  return { models, apiUrl: PIKCEL_API_URL };
};
```

### Main Component
- Search state management
- Category filter state
- Expand/collapse state
- Tool grouping by category
- Filtering logic
- Grid layout rendering
- Tool card rendering

## Advanced Customization

### Custom Category Order
Edit `CATEGORY_METADATA` in `app.ai-tools.tsx`:
```typescript
const categoryOrder = [
  'Content Generation',
  'Product Enhancement',
  // ... your order
];
```

### Custom Grid Columns
Update inline styles:
```css
gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))"
```

### Custom Colors/Badges
Update `CATEGORY_METADATA`:
```typescript
"Content Generation": {
  description: "...",
  icon: "✨",
  color: "purple"  // Use in badges
}
```

## Performance Notes

- Loads all 34 tools at once (fast with small dataset)
- Client-side filtering (instant response)
- Images lazy-loaded by browser
- No pagination needed (34 tools is manageable)

## Accessibility

- Semantic HTML with Polaris components
- ARIA labels on interactive elements
- Keyboard navigation support
- Screen reader friendly
- Focus management

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Ready to Use!

The AI Tools page is complete and ready to use. Just set `PIKCEL_API_URL` and start the app!

```bash
# Set environment variable
echo "PIKCEL_API_URL=https://api.pikcel.ai" >> .env

# Start app
npm run dev

# Visit
open http://localhost:3000/app/ai-tools
```
