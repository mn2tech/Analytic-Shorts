import { useState, useEffect } from 'react'

const RECENT_STORAGE_KEY = 'messages-emoji-recent'

const EMOJI_CATEGORIES = [
  {
    id: 'recent',
    label: 'Recent',
    icon: '🕐',
    emojis: []
  },
  {
    id: 'smileys',
    label: 'Smileys',
    icon: '😀',
    emojis: ['😀', '😊', '😄', '😁', '😅', '😂', '🤣', '😍', '😎', '🤔', '😅', '😢', '😭', '😤', '😡', '🤗', '😴', '🤩', '🥳', '😇', '🙂', '😉', '😌', '😏', '😬', '🤥', '😶', '🙄', '😮', '😲', '😳', '🥺', '😱', '😨', '😰', '😥', '😓', '🤯', '😵', '🥴', '😷']
  },
  {
    id: 'people',
    label: 'People',
    icon: '👍',
    emojis: ['👍', '👎', '👏', '🙌', '👋', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '👌', '🤌', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄']
  },
  {
    id: 'hearts',
    label: 'Hearts & Emotion',
    icon: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '😍', '🥰', '😘', '😗', '😙', '😚', '🤗', '🤭', '🤫', '🤔']
  },
  {
    id: 'objects',
    label: 'Objects',
    icon: '💼',
    emojis: ['💼', '📧', '📱', '💻', '⌨️', '🖥️', '📠', '📞', '📟', '📺', '📻', '🎙️', '⏰', '📅', '📆', '📌', '📍', '🔔', '💡', '🔦', '📦', '🎁', '🎯', '🚀', '✈️', '🛸', '⛵', '🚗', '🏆', '🥇', '📊', '📈', '✅', '❌', '⭐', '✨', '🔥', '💯']
  }
]

function getRecentEmojis() {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRecentEmoji(emoji) {
  const recent = getRecentEmojis()
  const filtered = recent.filter((e) => e !== emoji)
  const updated = [emoji, ...filtered].slice(0, 24)
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated))
  } catch { /* ignore */ }
}

export default function EmojiPanel({ onPick }) {
  const [activeCategory, setActiveCategory] = useState('recent')
  const [search, setSearch] = useState('')
  const [recentEmojis, setRecentEmojis] = useState(getRecentEmojis)

  useEffect(() => {
    setRecentEmojis(getRecentEmojis())
  }, [])

  const handlePick = (emoji) => {
    saveRecentEmoji(emoji)
    setRecentEmojis(getRecentEmojis())
    onPick(emoji)
  }

  const categories = EMOJI_CATEGORIES.map((cat) => ({
    ...cat,
    emojis: cat.id === 'recent' ? recentEmojis : cat.emojis
  }))

  const activeCat = categories.find((c) => c.id === activeCategory)
  let displayEmojis = activeCat?.emojis || []

  if (search.trim()) {
    const q = search.trim().toLowerCase()
    const matchingCats = categories.filter(
      (c) => c.id !== 'recent' && c.label?.toLowerCase().includes(q)
    )
    const allFromMatches = matchingCats.flatMap((c) => c.emojis)
    displayEmojis = [...new Set(allFromMatches)]
    if (displayEmojis.length === 0) {
      const allEmojis = categories
        .filter((c) => c.id !== 'recent')
        .flatMap((c) => c.emojis)
      displayEmojis = [...new Set(allEmojis)]
    }
  }

  return (
    <div className="w-full bg-white overflow-hidden">
      <div className="pb-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emoji"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>
      <div className="flex border-b border-gray-100 bg-gray-50/50 rounded-t-lg overflow-hidden">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => { setActiveCategory(cat.id); setSearch('') }}
            className={`flex-1 py-2.5 flex items-center justify-center text-lg transition-colors ${
              activeCategory === cat.id && !search
                ? 'bg-white border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            title={cat.label}
          >
            {cat.icon}
          </button>
        ))}
      </div>
      <div className="p-2 max-h-44 overflow-y-auto">
        {displayEmojis.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">No emojis found</p>
        ) : (
          <div className="grid grid-cols-8 gap-0.5">
            {displayEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="w-9 h-9 flex items-center justify-center text-xl hover:bg-gray-100 rounded-md transition-colors"
                onClick={() => handlePick(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
