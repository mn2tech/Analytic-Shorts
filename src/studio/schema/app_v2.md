# Multi-Page App Schema v2.0 (Extension)

## Overview

This document extends the Dashboard Schema v1.0 to support multi-page analytics apps while maintaining full backwards compatibility. A dashboard without `pages[]` is treated as a single-page app with one default page.

## Backwards Compatibility

- **Existing dashboards** (without `pages[]`): Continue to work as single-page dashboards
- **New multi-page apps**: Use `pages[]` array to define multiple pages
- **Migration**: No migration needed - existing dashboards work as-is

## Schema Extension

### Root-Level App Fields (Optional)

```json
{
  "version": "2.0",
  "app_id": "string (optional)",
  "app_title": "string (optional)",
  "pages": [ ... ],
  "global_filters": [ ... ],
  "metadata": { ... },
  "data_source": { ... },
  "filters": [ ... ],  // Page-level filters (deprecated in favor of global_filters for multi-page)
  "queries": [ ... ],
  "sections": [ ... ],  // Deprecated in favor of pages[].sections[]
  "layout": { ... },
  "theme": { ... }
}
```

### App-Level Properties

#### `app_id` (optional)
- **Type**: `string`
- **Description**: Unique identifier for the multi-page app
- **Default**: If not provided, uses `metadata.id`

#### `app_title` (optional)
- **Type**: `string`
- **Description**: Display title for the multi-page app
- **Default**: If not provided, uses `metadata.name`

#### `pages` (optional)
- **Type**: `array`
- **Description**: Array of page definitions. If not provided, app is treated as single-page with one default page containing all sections.
- **Structure**:
  ```json
  {
    "id": "string (required)",
    "title": "string (required)",
    "description": "string (optional)",
    "sections": [ ... ],
    "filters": [ ... ]  // Page-specific filters (optional)
  }
  ```

#### `global_filters` (optional)
- **Type**: `array`
- **Description**: Filters that apply to all pages. Same structure as `filters` but at app level.
- **Note**: If `pages[]` exists, prefer `global_filters` over root-level `filters`

### Page Object Structure

```json
{
  "id": "overview",
  "title": "Overview",
  "description": "Main dashboard overview",
  "sections": [
    {
      "id": "kpis",
      "title": "Key Metrics",
      "layout": "grid",
      "columns": 3,
      "widgets": [ ... ]
    }
  ],
  "filters": [ ... ]  // Page-specific filters (optional, in addition to global_filters)
}
```

### Widget Actions (New)

Widgets can now have `actions` property to enable drilldown navigation:

```json
{
  "id": "widget_sales_by_region",
  "type": "bar_chart",
  "title": "Sales by Region",
  "query_ref": "breakdown_by_region",
  "actions": {
    "onClick": {
      "type": "navigate",
      "targetPageId": "details",
      "passFilters": ["time_range", "region"],
      "passValueFrom": {
        "field": "Region",
        "as": "region"
      }
    }
  },
  "config": { ... }
}
```

#### Action Object Structure

```json
{
  "onClick": {
    "type": "navigate",
    "targetPageId": "string (required)",
    "passFilters": ["string"] (optional),
    "passValueFrom": {
      "field": "string (required)",
      "as": "string (optional, defaults to field name)"
    }
  }
}
```

- **`type`**: Currently only `"navigate"` is supported
- **`targetPageId`**: ID of the page to navigate to
- **`passFilters`**: Array of filter IDs to pass from current page to target page
- **`passValueFrom`**: Extract value from clicked chart element and set as filter
  - **`field`**: The field name in the chart data (e.g., "Region", "Product")
  - **`as`**: The filter ID to set (defaults to `field` if not provided)

## Single-Page Compatibility

If `pages[]` is not present, the app is treated as a single-page app:

1. Create a default page with `id: "default"`, `title: metadata.name`
2. Move all `sections[]` to `pages[0].sections[]`
3. Use root-level `filters[]` as `global_filters[]`

## Example: 2-Page App

```json
{
  "version": "2.0",
  "app_id": "sales-analytics-app",
  "app_title": "Sales Analytics",
  "metadata": {
    "id": "sales-analytics-app",
    "name": "Sales Analytics",
    "description": "Multi-page sales analytics dashboard"
  },
  "data_source": {
    "type": "api",
    "endpoint": "/api/example/sales"
  },
  "global_filters": [
    {
      "id": "time_range",
      "type": "time_range",
      "label": "Date Range",
      "default": {
        "start": "2024-01-01",
        "end": "2024-12-31"
      }
    }
  ],
  "queries": [
    {
      "id": "kpi_total_sales",
      "type": "aggregation",
      "metric": "Sales",
      "aggregation": "sum"
    },
    {
      "id": "breakdown_by_region",
      "type": "breakdown",
      "metric": "Sales",
      "dimension": "Region",
      "aggregation": "sum",
      "group_by": ["Region"]
    },
    {
      "id": "details_by_region",
      "type": "breakdown",
      "metric": "Sales",
      "dimension": "Product",
      "aggregation": "sum",
      "group_by": ["Product"],
      "filters": {
        "region": "{{filters.region}}"
      }
    }
  ],
  "pages": [
    {
      "id": "overview",
      "title": "Overview",
      "sections": [
        {
          "id": "kpis",
          "title": "Key Metrics",
          "layout": "grid",
          "columns": 1,
          "widgets": [
            {
              "id": "widget_total_sales",
              "type": "kpi",
              "title": "Total Sales",
              "query_ref": "kpi_total_sales",
              "format": {
                "type": "currency",
                "currency": "USD"
              }
            }
          ]
        },
        {
          "id": "breakdowns",
          "title": "Sales by Region",
          "layout": "grid",
          "columns": 1,
          "widgets": [
            {
              "id": "widget_sales_by_region",
              "type": "bar_chart",
              "title": "Sales by Region",
              "query_ref": "breakdown_by_region",
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
              },
              "config": {
                "x_axis": "Region",
                "y_axis": "Sales"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "details",
      "title": "Region Details",
      "sections": [
        {
          "id": "region_details",
          "title": "Product Sales by Region",
          "layout": "grid",
          "columns": 1,
          "widgets": [
            {
              "id": "widget_product_details",
              "type": "bar_chart",
              "title": "Sales by Product",
              "query_ref": "details_by_region",
              "config": {
                "x_axis": "Product",
                "y_axis": "Sales"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

## Metadata Extensions

For published apps, add to `metadata`:

```json
{
  "metadata": {
    "id": "...",
    "name": "...",
    "status": "draft | published",
    "version": "1.0.0",
    "published_at": "2024-01-15T10:00:00Z",
    "is_template": false
  }
}
```

- **`status`**: `"draft"` (editable) or `"published"` (view-only)
- **`version`**: Semantic version string
- **`published_at`**: ISO 8601 timestamp when published
- **`is_template`**: Boolean flag for template apps
