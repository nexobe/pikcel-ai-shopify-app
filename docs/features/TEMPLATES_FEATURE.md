# Templates Library Feature

## Overview

The Templates Library is a powerful feature that provides pre-built image editing workflows for Shopify merchants. Templates enable one-click application of professional editing operations to product images.

## File Structure

```
app/
├── routes/
│   └── app.templates.tsx          # Main templates page route
├── types/
│   └── templates.ts                # TypeScript type definitions
├── services/
│   ├── pikcelai.service.ts        # PikcelAI API service
│   └── pikcelai.types.ts          # API type definitions
```

## Features

### 1. Template Categories

- **E-commerce**: Platform-specific standards (Amazon, Shopify, Etsy)
- **Photo Editing**: Professional photo effects and enhancements
- **Trending**: Popular and trending editing styles
- **Custom**: User-created custom templates

### 2. Template Components

Each template includes:

- **Name & Description**: Clear identification
- **Preview Image**: Visual representation
- **Operations List**: Step-by-step editing workflow
- **Metadata**: Usage count, credits required, estimated time
- **Tags**: Searchable keywords

### 3. User Interface

#### Search & Filters
- Search by name, description, or tags
- Filter by category
- Show/hide template details

#### Template Cards
- Preview image display
- Template information
- Usage statistics
- Credits and time estimates
- Expandable operation steps
- "Apply Template" button

#### Layout
- Responsive grid layout (3 columns)
- Grouped by category
- Primary action for creating custom templates

## API Integration

### Endpoint

```
GET /api/enterprise/bulk/templates
```

### Query Parameters

- `category` (optional): Filter by template category
- `search` (optional): Search term
- `limit` (optional): Number of results (default: 100)
- `offset` (optional): Pagination offset

### Response Format

```typescript
{
  success: boolean;
  data: Template[];
  count: number;
  total: number;
  has_more: boolean;
}
```

## Template Application Flow

1. User selects a template from the library
2. Template details are displayed
3. User clicks "Apply Template"
4. Product selection modal opens (to be implemented)
5. Template is applied to selected products
6. Batch job is created
7. Progress tracking begins

## Configuration

### Environment Variables

Add to `.env`:

```bash
PIKCEL_API_URL=https://app.pikcel.ai
PIKCEL_API_KEY=your_api_key_here
```

### Navigation

The Templates page is automatically added to the app navigation:

```tsx
<s-link href="/app/templates">Templates</s-link>
```

## Mock Data

When the API is unavailable, the page displays mock templates for demonstration:

- Amazon Standard White Background
- Shopify Transparent Background
- Etsy Clean Background
- Blur Background
- Color Splash Effect
- Vintage Photo Look
- Motion Blur Effect
- Cinematic Film Look

## Template Structure

```typescript
interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;

  // Visual
  preview_image_url: string;
  example_before_url?: string;
  example_after_url?: string;

  // Operations
  operations: TemplateOperation[];

  // Metadata
  usage_count: number;
  popularity_score: number;
  tags: string[];

  // Timing
  estimated_time_seconds: number;
  credits_required: number;

  // Status
  is_featured: boolean;
  is_premium: boolean;
  is_active: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}
```

## Future Enhancements

### Phase 1 (Current)
- [x] Display templates from API
- [x] Category filtering
- [x] Search functionality
- [x] Template details view
- [ ] Mock data fallback

### Phase 2
- [ ] Product selection modal
- [ ] Batch template application
- [ ] Progress tracking
- [ ] Template preview (before/after)

### Phase 3
- [ ] Custom template creation
- [ ] Template editing
- [ ] Template sharing
- [ ] Template favorites

### Phase 4
- [ ] Template analytics
- [ ] Template recommendations
- [ ] A/B testing
- [ ] Template marketplace

## Error Handling

The page gracefully handles API failures:

1. Catches API errors
2. Displays error banner
3. Falls back to mock data
4. Allows user to continue exploring

## Performance Considerations

- Templates are loaded once on page load
- Client-side filtering (no additional API calls)
- Lazy loading of template details
- Image lazy loading for preview images

## Testing

### Manual Testing

1. Navigate to `/app/templates`
2. Verify templates display correctly
3. Test category filters
4. Test search functionality
5. Test "Show Steps" toggle
6. Test "Apply Template" button

### Integration Testing

1. Mock PikcelAI API responses
2. Test error handling
3. Test empty states
4. Test loading states

## Support

For API integration issues:
- Check `PIKCEL_API_KEY` environment variable
- Verify API endpoint is accessible
- Check network connectivity
- Review API documentation

## Related Documentation

- [Integration Plan](./INTEGRATION_PLAN.md)
- [Integration Flows](./INTEGRATION_FLOWS.md)
- [PikcelAI API Documentation](https://docs.pikcel.ai)

## Changelog

### 2025-10-05
- Initial templates library implementation
- Category filtering
- Search functionality
- Mock data fallback
- Navigation integration
