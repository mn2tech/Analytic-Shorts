# Dashboard Schema v1.0

## Overview

This document defines the schema for Analytics Shorts Studio dashboard definitions. A dashboard is a JSON document that describes the structure, queries, filters, and visualizations of an analytics dashboard.

## Schema Structure

```json
{
  "version": "string",
  "metadata": { ... },
  "data_source": { ... },
  "filters": [ ... ],
  "queries": [ ... ],
  "sections": [ ... ],
  "layout": { ... },
  "theme": { ... }
}
```

## Root Properties

### `version` (required)
- **Type**: `string`
- **Description**: Schema version identifier
- **Example**: `"1.0"`

### `metadata` (required)
- **Type**: `object`
- **Description**: Dashboard metadata and identification
- **Properties**:
  - `id` (string, required): Unique dashboard identifier
  - `name` (string, required): Dashboard display name
  - `description` (string, optional): Dashboard description
  - `created_at` (string, ISO 8601, optional): Creation timestamp
  - `updated_at` (string, ISO 8601, optional): Last update timestamp
  - `author` (string, optional): Dashboard author/creator

### `data_source` (required)
- **Type**: `object`
- **Description**: Defines where dashboard data comes from
- **Properties**:
  - `type` (string, required): Data source type (`"api"`, `"file"`, `"database"`)
  - `endpoint` (string, optional): API endpoint URL (for `type: "api"`)
  - `refresh_interval` (number, optional): Auto-refresh interval in seconds

### `filters` (required)
- **Type**: `array`
- **Description**: User-configurable filters that affect all queries
- **Filter Types**:
  - `time_range`: Date range picker
  - `dropdown`: Single or multi-select dropdown
  - `text`: Text input filter
  - `numeric_range`: Numeric range slider

#### Filter Object Structure
```json
{
  "id": "string (required)",
  "type": "time_range | dropdown | text | numeric_range",
  "label": "string (required)",
  "default": "any (optional)",
  "required": "boolean (optional, default: false)",
  "source": "dimension | static | query (for dropdown)",
  "dimension": "string (optional, for dropdown with source: dimension)",
  "multi_select": "boolean (optional, default: false)"
}
```

### `queries` (required)
- **Type**: `array`
- **Description**: Data queries that widgets reference
- **Query Types**:
  - `aggregation`: Single metric aggregation (sum, avg, count, etc.)
  - `time_series`: Time-based data series
  - `breakdown`: Dimension breakdown with metric aggregation
  - `table`: Raw data table query

#### Query Object Structure
```json
{
  "id": "string (required)",
  "type": "aggregation | time_series | breakdown | table",
  "metric": "string (required)",
  "aggregation": "sum | avg | count | min | max (required for aggregation/breakdown)",
  "dimension": "string (required for time_series/breakdown)",
  "group_by": ["string"] (optional),
  "order_by": "string (optional)",
  "order_direction": "asc | desc (optional)",
  "limit": "number (optional)",
  "filters": {
    "filter_id": "{{filters.filter_id}}"
  }
}
```

**Filter References**: Use `{{filters.filter_id}}` syntax to reference filter values in queries.

### `sections` (required)
- **Type**: `array`
- **Description**: Dashboard sections containing widgets
- **Section Properties**:
  - `id` (string, required): Unique section identifier
  - `title` (string, required): Section display title
  - `layout` (string, required): Layout type (`"grid"`, `"row"`, `"column"`)
  - `columns` (number, optional): Number of columns in grid layout
  - `widgets` (array, required): Array of widget definitions

### `widgets` (within sections)
- **Type**: `array`
- **Description**: Visualization widgets within a section
- **Widget Types**:
  - `kpi`: Key Performance Indicator (single metric display)
  - `line_chart`: Line chart visualization
  - `bar_chart`: Bar chart visualization
  - `pie_chart`: Pie/donut chart visualization
  - `table`: Data table widget

#### Widget Object Structure
```json
{
  "id": "string (required)",
  "type": "kpi | line_chart | bar_chart | pie_chart | table",
  "title": "string (required)",
  "query_ref": "string (required)",
  "config": { ... },
  "format": { ... }
}
```

**Widget-Specific Configs**:

- **KPI Widget**:
  ```json
  {
    "format": {
      "type": "currency | number | percentage",
      "currency": "USD (for currency)",
      "decimals": 0
    },
    "trend": {
      "enabled": true,
      "period": "previous_period | previous_year",
      "format": "percentage | absolute"
    }
  }
  ```

- **Line Chart Widget**:
  ```json
  {
    "config": {
      "x_axis": "string",
      "y_axis": "string",
      "show_grid": true,
      "show_legend": false,
      "curve": "linear | monotone | step"
    },
    "format": {
      "y_axis": {
        "type": "currency | number",
        "currency": "USD",
        "decimals": 0
      }
    }
  }
  ```

- **Bar Chart Widget**:
  ```json
  {
    "config": {
      "orientation": "horizontal | vertical",
      "x_axis": "string",
      "y_axis": "string",
      "show_grid": true,
      "show_legend": false,
      "sort": "asc | desc | none"
    },
    "format": {
      "x_axis": { ... },
      "y_axis": { ... }
    }
  }
  ```

- **Table Widget**:
  ```json
  {
    "config": {
      "columns": ["string"],
      "sortable": true,
      "pagination": true,
      "page_size": 25
    }
  }
  ```

### `layout` (optional)
- **Type**: `object`
- **Description**: Responsive layout configuration
- **Properties**:
  - `type` (string): Layout type (`"responsive"`, `"fixed"`)
  - `breakpoints` (object): Breakpoint-specific configurations
    - `mobile`, `tablet`, `desktop`: Each with `sections` array and `columns` number

### `theme` (optional)
- **Type**: `object`
- **Description**: Visual theme configuration
- **Properties**:
  - `primary_color` (string, hex color)
  - `secondary_color` (string, hex color)
  - `background_color` (string, hex color)
  - `text_color` (string, hex color)

## Filter Reference Syntax

Filters are referenced in queries using the `{{filters.filter_id}}` syntax:

```json
{
  "filters": {
    "time_range": "{{filters.time_range}}",
    "region": "{{filters.region}}"
  }
}
```

The system will replace these placeholders with actual filter values at query execution time.

## Query Types

### Aggregation Query
Single metric calculation (sum, average, count, etc.)

```json
{
  "id": "total_sales",
  "type": "aggregation",
  "metric": "Sales",
  "aggregation": "sum",
  "filters": { ... }
}
```

### Time Series Query
Time-based data with grouping by date dimension

```json
{
  "id": "sales_trend",
  "type": "time_series",
  "metric": "Sales",
  "dimension": "Date",
  "aggregation": "sum",
  "group_by": ["Date"],
  "order_by": "Date",
  "filters": { ... }
}
```

### Breakdown Query
Dimension breakdown with metric aggregation

```json
{
  "id": "product_breakdown",
  "type": "breakdown",
  "metric": "Sales",
  "dimension": "Product",
  "aggregation": "sum",
  "group_by": ["Product"],
  "order_by": "Sales",
  "order_direction": "desc",
  "limit": 10,
  "filters": { ... }
}
```

### Table Query
Raw data table with optional filtering and sorting

```json
{
  "id": "raw_data",
  "type": "table",
  "columns": ["Date", "Product", "Sales", "Region"],
  "filters": { ... },
  "order_by": "Date",
  "limit": 100
}
```

## Widget Types

### KPI Widget
Displays a single metric with optional trend indicator

### Line Chart Widget
Time series visualization with configurable axes and styling

### Bar Chart Widget
Categorical comparison chart (horizontal or vertical)

### Pie Chart Widget
Proportional breakdown visualization

### Table Widget
Tabular data display with sorting and pagination

## Example Dashboard

See `src/studio/examples/sample_dashboard.json` for a complete example dashboard definition.

## Version History

- **v1.0** (2024-01-15): Initial schema definition
