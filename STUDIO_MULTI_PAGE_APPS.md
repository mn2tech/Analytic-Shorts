# Studio Multi-Page Apps Guide

## Overview

Analytics Shorts Studio now supports multi-page analytics apps, allowing you to create navigation flows, drilldown actions, and persistent filters across pages. This is an **extension** of the existing Studio functionality - all existing single-page dashboards continue to work as before.

## Key Features

1. **Multi-Page Navigation**: Create apps with multiple pages (Overview → Details → Drill)
2. **Global Filters**: Filters that persist across all pages
3. **Drilldown Actions**: Click charts to navigate to detail pages with context
4. **Published View Mode**: View-only mode for consumers/managers
5. **Version Locking**: Published apps lock their schema version

## Schema Extension (v2.0)

The multi-page app schema extends the existing v1.0 schema with optional fields:

- `app_id` / `app_title`: App-level identifiers
- `pages[]`: Array of page definitions
- `global_filters[]`: Filters that apply to all pages
- `actions.onClick`: Widget actions for drilldown navigation

**Backwards Compatibility**: Dashboards without `pages[]` are automatically converted to single-page apps.

See `src/studio/schema/app_v2.md` for full schema documentation.

## Routes

### Editor Mode
- `/studio/app/new` - Create new multi-page app
- `/studio/app/:id` - Edit existing app (draft mode)

### View Mode (Published)
- `/apps/:id` - View published app (defaults to first page)
- `/apps/:id/:pageId` - View specific page with filters in URL

## Creating a Multi-Page App

### 1. Start from Sample

Navigate to `/studio/app/new` to create a new app from the sample 2-page template.

### 2. Define Pages

Each page has:
- `id`: Unique page identifier
- `title`: Display title
- `description`: Optional description
- `sections[]`: Array of sections with widgets
- `filters[]`: Optional page-specific filters

### 3. Add Global Filters

Define filters at the app level that apply to all pages:

```json
{
  "global_filters": [
    {
      "id": "time_range",
      "type": "time_range",
      "label": "Date Range",
      "default": { "start": "2024-01-01", "end": "2024-12-31" }
    }
  ]
}
```

### 4. Add Drilldown Actions

Add `actions.onClick` to widgets to enable navigation:

```json
{
  "id": "widget_sales_by_region",
  "type": "bar_chart",
  "actions": {
    "onClick": {
      "type": "navigate",
      "targetPageId": "details",
      "passFilters": ["time_range"],
      "passValueFrom": {
        "field": "Region",
        "as": "region"
      }
    }
  }
}
```

**Action Properties**:
- `targetPageId`: Page to navigate to
- `passFilters`: Array of filter IDs to pass from current page
- `passValueFrom`: Extract value from clicked chart element
  - `field`: Field name in chart data
  - `as`: Filter ID to set (defaults to field name)

### 5. Save and Publish

- **Save**: Saves as draft (editable)
- **Publish**: Locks version and makes view-only

Published apps redirect to `/apps/:id` (view mode).

## Example: 2-Page Sales App

See `src/studio/examples/sample_app_2page.json` for a complete example with:
- Overview page with KPI and regional breakdown
- Details page showing product sales for selected region
- Drill page showing time series for selected product
- Drilldown actions connecting all pages

## Filter Persistence

Filters are stored in URL query parameters:
- Format: `?filter_time_range=...&filter_region=MD`
- Persists across page navigation
- Shared between editor and view modes

## Published Apps (View Mode)

Published apps are:
- **View-only**: No editing controls
- **Version-locked**: Schema cannot be modified
- **Shareable**: Can be shared via `/apps/:id` URL
- **Filter-enabled**: Users can still interact with filters

## Backend API

### Publish Endpoint

```
POST /api/dashboards/:id/publish
```

Publishes a dashboard and locks the schema version. Sets:
- `metadata.status = "published"`
- `metadata.published_at = <timestamp>`
- `metadata.version = <version>`

## Migration from Single-Page

Existing single-page dashboards automatically work:
1. Load dashboard schema
2. If no `pages[]`, create default page with all sections
3. Move root-level `filters[]` to `global_filters[]`
4. Render as single-page app

No migration script needed - happens automatically at runtime.

## Components

### AppShell
Top navigation, page tabs, Save/Publish controls, mode indicator.

### PageRenderer
Renders sections and widgets for current page. Handles:
- Filter rendering
- Query execution
- Widget rendering
- Drilldown actions

### FilterBar
Reusable filter controls (time range, dropdown, text).

### Widget Components
- `StudioKPIWidget`: KPI display
- `StudioLineChartWidget`: Line chart with drilldown support
- `StudioBarChartWidget`: Bar chart with drilldown support

## Guardrails (Pilot Mode)

- Max rows per query: 10,000 (configurable)
- Export limit: 5,000 rows
- PII blocking: Sensitive fields blocked in options endpoint
- Display: "Pilot Mode limits enabled" in UI

## Next Steps

1. Test with sample app: `/studio/app/new`
2. Create custom multi-page app
3. Add drilldown actions to charts
4. Publish and share via `/apps/:id`

## Troubleshooting

**Charts not clickable?**
- Ensure widget has `actions.onClick` defined
- Check that `targetPageId` matches a page ID

**Filters not persisting?**
- Check URL query parameters
- Verify filter IDs match between pages

**Published app still editable?**
- Check `metadata.status === "published"`
- Verify redirect to `/apps/:id` route
