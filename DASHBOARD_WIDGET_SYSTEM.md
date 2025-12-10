# 📊 Interactive Dashboard Widget System

## Overview

The dashboard now supports interactive drag-and-drop, resize, and delete functionality for all widgets. Users can customize their dashboard layout and persist their preferences.

## Features

✅ **Drag & Drop**: Drag widgets by their header to reorder them  
✅ **Resize**: Resize widgets by dragging from edges/corners  
✅ **Delete**: Remove widgets using the X button in the top-right corner  
✅ **Persistence**: Layouts are automatically saved to localStorage  
✅ **Responsive**: Different layouts for desktop, tablet, and mobile  
✅ **Restore**: Layouts are restored when you reload the page  

## Widget Types

The dashboard includes the following widgets:

1. **Line Chart** (`line-chart`) - Shows time series data
2. **Donut Chart** (`donut-chart`) - Distribution by category
3. **Distribution List** (`distribution-list`) - Category breakdown list
4. **Sunburst Chart** (`sunburst-chart`) - Hierarchical distribution
5. **Bar Chart** (`bar-chart`) - Category comparison
6. **Forecast Chart** (`forecast-chart`) - Predictive analytics

## How to Use

### Drag a Widget
1. Click and hold on the widget header (the gray bar with the title)
2. Drag to your desired position
3. Release to drop

### Resize a Widget
1. Hover over the edges or corners of a widget
2. Click and drag to resize
3. Release when satisfied

### Delete a Widget
1. Click the X button in the top-right corner of the widget header
2. Confirm deletion in the dialog
3. The widget will be hidden (can be restored by resetting layout)

### Reset to Default Layout
To reset your dashboard to the default layout:

```javascript
// In browser console:
localStorage.removeItem('dashboard_layouts')
localStorage.removeItem('dashboard_widget_visibility')
location.reload()
```

## Adding a New Widget

To add a new widget to the dashboard:

### 1. Create Widget Component

Create a new file in `src/components/widgets/`:

```jsx
// src/components/widgets/MyNewWidget.jsx
function MyNewWidget({ data, selectedNumeric, ...props }) {
  return (
    <div className="h-full">
      {/* Your widget content */}
    </div>
  )
}

export default MyNewWidget
```

### 2. Add to Widget Renderer

Update `src/components/widgets/WidgetRenderer.jsx`:

```jsx
import MyNewWidget from './MyNewWidget'

// In the switch statement:
case 'my-new-widget':
  return <MyNewWidget {...props} />
```

### 3. Add Widget Configuration

Update `src/config/widgetConfig.js`:

```javascript
export const WIDGET_CONFIGS = {
  // ... existing widgets
  'my-new-widget': {
    id: 'my-new-widget',
    title: 'My New Widget',
    component: 'my-new-widget',
    defaultLayout: { i: 'my-new-widget', x: 0, y: 0, w: 6, h: 4 },
    minW: 4,
    minH: 3,
    maxW: 12,
    maxH: 6
  }
}

// Add to default widgets list
export const DEFAULT_WIDGETS = [
  // ... existing widgets
  'my-new-widget'
]
```

### 4. Update Default Layouts

The `getDefaultLayouts()` function will automatically include your new widget. Make sure to position it appropriately in the `DEFAULT_WIDGETS` array to control its initial position.

## Layout Persistence

### How It Works

- Layouts are saved to `localStorage` with key `dashboard_layouts`
- Widget visibility is saved with key `dashboard_widget_visibility`
- Layouts are saved automatically after every drag/resize operation
- Layouts are restored when the dashboard loads

### Storage Structure

```javascript
// dashboard_layouts
{
  lg: [{ i: 'line-chart', x: 0, y: 0, w: 6, h: 4 }, ...],
  md: [{ i: 'line-chart', x: 0, y: 0, w: 8, h: 4 }, ...],
  sm: [...],
  xs: [...],
  xxs: [...]
}

// dashboard_widget_visibility
{
  'line-chart': true,
  'donut-chart': true,
  'distribution-list': false, // hidden
  ...
}
```

## Responsive Breakpoints

The grid layout uses the following breakpoints (matching Tailwind CSS):

- **lg** (≥1200px): 12 columns - Desktop
- **md** (≥768px): 10 columns - Tablet
- **sm** (≥640px): 6 columns - Small tablet
- **xs** (≥480px): 6 columns - Large phone
- **xxs** (<480px): 6 columns - Small phone

Each breakpoint can have its own layout configuration.

## Technical Details

### Components

- **AdvancedDashboardGrid**: Main grid layout component using React Grid Layout
- **DashboardWidget**: Wrapper component with drag handle and delete button
- **WidgetRenderer**: Routes widget IDs to their components
- **Widget Components**: Individual chart/widget implementations

### Dependencies

- `react-grid-layout`: Grid layout library
- `react-resizable`: Resize handles (included with react-grid-layout)

### Files

- `src/components/AdvancedDashboardGrid.jsx` - Main grid component
- `src/components/DashboardWidget.jsx` - Widget wrapper
- `src/components/widgets/` - Individual widget components
- `src/config/widgetConfig.js` - Widget configuration
- `src/utils/layoutPersistence.js` - Layout save/load utilities
- `src/types/widget.ts` - TypeScript type definitions

## Troubleshooting

### Widgets not appearing
- Check that the widget ID is in `DEFAULT_WIDGETS` array
- Verify widget visibility is not set to `false` in localStorage
- Check browser console for errors

### Layout not saving
- Check browser localStorage quota
- Verify `saveLayouts()` is being called
- Check browser console for errors

### Drag not working
- Ensure you're clicking on the widget header (has `drag-handle` class)
- Check that `isDraggable={true}` is set on GridLayout
- Verify `draggableHandle=".drag-handle"` is configured

### Resize not working
- Check that `isResizable={true}` is set on GridLayout
- Verify widget has `minW` and `minH` constraints
- Check browser console for errors

## Future Enhancements

Potential improvements:

- [ ] Add widget restore functionality (show deleted widgets)
- [ ] Add widget duplication
- [ ] Add custom widget sizes presets
- [ ] Add layout templates/export
- [ ] Add backend persistence (save to database)
- [ ] Add collaborative layouts (share layouts between users)

