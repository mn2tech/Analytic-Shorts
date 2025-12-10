// Type definitions for dashboard widgets

export interface WidgetLayout {
  i: string // widget id
  x: number // x position in grid
  y: number // y position in grid
  w: number // width in grid units
  h: number // height in grid units
  minW?: number // minimum width
  minH?: number // minimum height
  maxW?: number // maximum width
  maxH?: number // maximum height
}

export interface DashboardWidget {
  id: string
  title: string
  component: string // component identifier (e.g., 'line-chart', 'donut-chart')
  layout: WidgetLayout
  visible: boolean
}

export interface WidgetConfig {
  id: string
  title: string
  component: string
  defaultLayout: WidgetLayout
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
}

export type LayoutBreakpoint = 'lg' | 'md' | 'sm' | 'xs' | 'xxs'

export interface DashboardLayouts {
  lg?: WidgetLayout[]
  md?: WidgetLayout[]
  sm?: WidgetLayout[]
  xs?: WidgetLayout[]
  xxs?: WidgetLayout[]
}

