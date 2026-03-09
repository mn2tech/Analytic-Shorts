/**
 * ImageUpload - Floor plan image upload with drag-and-drop.
 * Healthcare operations styling.
 */
import React, { useCallback, useState } from 'react'

export default function ImageUpload({ onUpload, disabled }) {
  const [drag, setDrag] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleDrop = useCallback(
    async (e) => {
      e.preventDefault()
      setDrag(false)
      setError(null)
      const file = e.dataTransfer?.files?.[0]
      if (!file || !file.type.startsWith('image/')) {
        setError('Please drop an image file (PNG, JPEG, etc.)')
        return
      }
      setLoading(true)
      try {
        await onUpload(file)
      } catch (err) {
        setError(err.message || 'Upload failed')
      } finally {
        setLoading(false)
      }
    },
    [onUpload]
  )

  const handleFileInput = useCallback(
    async (e) => {
      setError(null)
      const file = e.target.files?.[0]
      if (!file) return
      setLoading(true)
      try {
        await onUpload(file)
      } catch (err) {
        setError(err.message || 'Upload failed')
      } finally {
        setLoading(false)
      }
      e.target.value = ''
    },
    [onUpload]
  )

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
        ${drag ? 'border-teal-500 bg-teal-50/50' : 'border-slate-300 bg-slate-50/50'}
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-teal-400'}
      `}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        disabled={disabled || loading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      {loading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-600">Uploading...</p>
        </div>
      ) : (
        <>
          <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-slate-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-700">Drop floor plan image here</p>
          <p className="text-xs text-slate-500 mt-1">or click to browse (PNG, JPEG)</p>
        </>
      )}
      {error && (
        <p className="mt-3 text-sm text-rose-600">{error}</p>
      )}
    </div>
  )
}
