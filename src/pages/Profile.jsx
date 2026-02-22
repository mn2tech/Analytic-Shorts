import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getUserProfile, updateUserProfile } from '../services/profileService'
import { supabase } from '../lib/supabase'
import Loader from '../components/Loader'

const AVATAR_BUCKET = 'avatars'
const DEFAULT_FOCAL = { x: 50, y: 50 }

function getInitials(name) {
  if (!name || !String(name).trim()) return '?'
  const parts = String(name).trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
  return String(name).slice(0, 2).toUpperCase()
}

function clamp(num, min, max) {
  return Math.min(max, Math.max(min, num))
}

export default function Profile() {
  const { user, refreshUserProfile } = useAuth()
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [preferences, setPreferences] = useState({})
  const [avatarFocal, setAvatarFocal] = useState(DEFAULT_FOCAL)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const repositionRef = useRef(null)
  const dragStart = useRef(null)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    let cancelled = false
    getUserProfile(user.id)
      .then((profile) => {
        if (!cancelled) {
          setName(profile?.name ?? '')
          setAvatarUrl(profile?.avatar_url ?? '')
          setPreferences(profile?.preferences ?? {})
          const focal = profile?.preferences?.avatar_focal
          setAvatarFocal(
            focal && typeof focal.x === 'number' && typeof focal.y === 'number'
              ? { x: clamp(focal.x, 0, 100), y: clamp(focal.y, 0, 100) }
              : DEFAULT_FOCAL
          )
        }
      })
      .catch(() => {
        if (!cancelled) setName('')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [user?.id])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!user?.id) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await updateUserProfile(user.id, {
        name: name.trim() || undefined,
        avatar_url: avatarUrl.trim() || null,
        preferences: { ...preferences, avatar_focal: avatarFocal }
      })
      await refreshUserProfile()
      setMessage({ type: 'success', text: 'Profile updated.' })
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Failed to save profile.' })
    } finally {
      setSaving(false)
    }
  }

  const handleRepositionPointerDown = useCallback(
    (e) => {
      if (!avatarUrl) return
      e.preventDefault()
      const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0
      const y = e.clientY ?? e.touches?.[0]?.clientY ?? 0
      dragStart.current = { x, y, focalX: avatarFocal.x, focalY: avatarFocal.y }
    },
    [avatarUrl, avatarFocal]
  )

  const handleRepositionPointerMove = useCallback((e) => {
    if (dragStart.current == null) return
    const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const y = e.clientY ?? e.touches?.[0]?.clientY ?? 0
    const el = repositionRef.current
    const size = el ? Math.max(el.getBoundingClientRect().width, el.getBoundingClientRect().height) : 200
    const scale = 100 / size
    const deltaX = x - dragStart.current.x
    const deltaY = y - dragStart.current.y
    setAvatarFocal({
      x: clamp(dragStart.current.focalX - deltaX * scale, 0, 100),
      y: clamp(dragStart.current.focalY - deltaY * scale, 0, 100)
    })
  }, [])

  const handleRepositionPointerUp = useCallback(() => {
    dragStart.current = null
  }, [])

  useEffect(() => {
    const onMove = (e) => handleRepositionPointerMove(e)
    const onUp = () => handleRepositionPointerUp()
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [handleRepositionPointerMove, handleRepositionPointerUp])

  const handleAvatarFile = async (e) => {
    const file = e.target?.files?.[0]
    if (!file || !user?.id) return
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please choose an image file (e.g. JPG, PNG).' })
      return
    }
    setUploading(true)
    setMessage({ type: '', text: '' })
    try {
      const path = `${user.id}/avatar`
      const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
      setAvatarUrl(publicUrl)
      setAvatarFocal(DEFAULT_FOCAL)
      await updateUserProfile(user.id, { avatar_url: publicUrl, preferences: { ...preferences, avatar_focal: DEFAULT_FOCAL } })
      await refreshUserProfile()
      setMessage({ type: 'success', text: 'Profile picture updated.' })
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Upload failed. You can paste an image URL below instead.' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-gray-600">Sign in to edit your profile.</p>
      </div>
    )
  }

  if (loading) return <Loader />

  const displayName = name.trim() || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'
  const initials = getInitials(displayName)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>
      <p className="text-gray-600 mb-6">Set your display name and profile picture. They appear on your posts in the Feed.</p>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Profile picture</label>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-shrink-0 w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-2xl">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ objectPosition: `${avatarFocal.x}% ${avatarFocal.y}%` }}
                />
              ) : (
                initials
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 cursor-pointer">
                <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarFile} disabled={uploading} />
                {uploading ? 'Uploading…' : 'Upload photo'}
              </label>
              <span className="text-xs text-gray-500">Or paste an image URL below</span>
            </div>
          </div>
          {avatarUrl && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Drag the picture to reposition it</p>
              <div
                ref={repositionRef}
                role="button"
                tabIndex={0}
                onPointerDown={handleRepositionPointerDown}
                onTouchStart={handleRepositionPointerDown}
                className="w-40 h-40 rounded-full overflow-hidden bg-gray-200 border-2 border-dashed border-gray-400 cursor-grab active:cursor-grabbing select-none touch-none"
                style={{ maxWidth: '100%' }}
                aria-label="Drag to reposition profile picture"
              >
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-full h-full object-cover pointer-events-none"
                  style={{ objectPosition: `${avatarFocal.x}% ${avatarFocal.y}%` }}
                  draggable={false}
                />
              </div>
            </div>
          )}
          <input
            type="url"
            placeholder="https://… (image URL)"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Display name */}
        <div>
          <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 mb-2">Display name</label>
          <input
            id="profile-name"
            type="text"
            placeholder="Your name (e.g. Jane Smith)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {message.text && (
          <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  )
}
