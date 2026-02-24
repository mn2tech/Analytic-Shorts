import React from 'react'

export function CardSkeleton({ className = '', lines = 3 }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 shadow-sm animate-pulse ${className}`}>
      <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-100 rounded w-full" style={{ width: i === lines - 1 ? '70%' : '100%' }} />
        ))}
      </div>
    </div>
  )
}

export function KPIRowSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm animate-pulse">
          <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
          <div className="h-8 bg-gray-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}
