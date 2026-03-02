/**
 * Email notifications for messages, follows, likes, saves, and comments.
 * Uses Resend (https://resend.com) when RESEND_API_KEY is set; otherwise logs and skips.
 */

const { getSupabaseAdmin } = require('./supabaseAdmin')

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.NOTIFICATION_EMAIL_FROM || 'Analytics Shorts <onboarding@resend.dev>'
const FRONTEND_URL = (process.env.FRONTEND_URL || process.env.VITE_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

async function getUserEmail(userId) {
  if (!userId) return null
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase?.auth?.admin?.getUserById) return null
    const { data } = await supabase.auth.admin.getUserById(userId)
    const user = data?.user ?? data
    return user?.email ? String(user.email).trim() : null
  } catch (err) {
    console.warn('[email] could not resolve auth email for user:', userId, err?.message || err)
    return null
  }
}

async function sendEmail(toEmail, subject, html) {
  if (!toEmail || !String(toEmail).trim()) return
  const key = RESEND_API_KEY?.trim()
  if (!key) {
    console.warn('[email] RESEND_API_KEY not set — skipping', { to: toEmail?.slice(0, 20) + '…', subject })
    return false
  }
  if (typeof fetch === 'undefined') {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[email] (no fetch) would send:', { to: toEmail, subject })
    }
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [String(toEmail).trim()],
        subject,
        html
      })
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[email] Resend error:', res.status, err)
      return false
    }
    return true
  } catch (err) {
    console.error('[email] send failed:', err?.message || err)
    return false
  }
}

function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Notify recipient when they receive a new direct message. */
async function sendNewMessageNotification(recipientUserId, senderDisplayName, bodyPreview, senderUserId = null) {
  const email = await getUserEmail(recipientUserId)
  if (!email) {
    console.warn('[email] message notification skipped: recipient has no auth email', { recipientUserId })
    return false
  }
  const name = escapeHtml(senderDisplayName || 'Someone')
  const preview = escapeHtml((bodyPreview || '').slice(0, 200))
  const encoded = senderUserId ? encodeURIComponent(String(senderUserId)) : ''
  const link = senderUserId
    ? `${FRONTEND_URL}/messages?with=${encoded}#with=${encoded}`
    : `${FRONTEND_URL}/messages`
  return sendEmail(
    email,
    `${name} sent you a message — Analytics Shorts`,
    `
      <p>${name} sent you a message on Analytics Shorts.</p>
      ${preview ? `<p><em>${preview}${(bodyPreview || '').length > 200 ? '…' : ''}</em></p>` : ''}
      <p><a href="${link}">View messages</a></p>
      <p style="color:#888;font-size:12px;">You received this because you have an Analytics Shorts account.</p>
    `.trim().replace(/\n\s+/g, '\n')
  )
}

/** Notify a user when they receive a new follower. */
async function sendFollowNotification(recipientUserId, followerDisplayName, followerUserId) {
  if (!recipientUserId) return
  const email = await getUserEmail(recipientUserId)
  if (!email) return
  const follower = escapeHtml(followerDisplayName || 'Someone')
  const link = followerUserId ? `${FRONTEND_URL}/profile/${followerUserId}` : `${FRONTEND_URL}/feed?scope=following`
  return sendEmail(
    email,
    `${follower} started following you — Analytics Shorts`,
    `
      <p>${follower} started following you on Analytics Shorts.</p>
      <p><a href="${link}">View profile</a></p>
      <p style="color:#888;font-size:12px;">You received this because you have an Analytics Shorts account.</p>
    `.trim().replace(/\n\s+/g, '\n')
  )
}

/** Notify post author when someone likes their post. */
async function sendLikeNotification(recipientUserId, actorDisplayName, postTitle, postId) {
  if (!recipientUserId) return
  const email = await getUserEmail(recipientUserId)
  if (!email) return
  const actor = escapeHtml(actorDisplayName || 'Someone')
  const title = escapeHtml((postTitle || 'your post').slice(0, 100))
  const link = `${FRONTEND_URL}/post/${postId}`
  return sendEmail(
    email,
    `${actor} liked your post — Analytics Shorts`,
    `
      <p>${actor} liked your post <strong>${title}</strong>.</p>
      <p><a href="${link}">View post</a></p>
      <p style="color:#888;font-size:12px;">You received this because you have an Analytics Shorts account.</p>
    `.trim().replace(/\n\s+/g, '\n')
  )
}

/** Notify post author when someone saves their post. */
async function sendSaveNotification(recipientUserId, actorDisplayName, postTitle, postId) {
  if (!recipientUserId) return
  const email = await getUserEmail(recipientUserId)
  if (!email) return
  const actor = escapeHtml(actorDisplayName || 'Someone')
  const title = escapeHtml((postTitle || 'your post').slice(0, 100))
  const link = `${FRONTEND_URL}/post/${postId}`
  return sendEmail(
    email,
    `${actor} saved your post — Analytics Shorts`,
    `
      <p>${actor} saved your post <strong>${title}</strong>.</p>
      <p><a href="${link}">View post</a></p>
      <p style="color:#888;font-size:12px;">You received this because you have an Analytics Shorts account.</p>
    `.trim().replace(/\n\s+/g, '\n')
  )
}

/** Notify post author when someone comments on their post. */
async function sendCommentNotification(recipientUserId, actorDisplayName, postTitle, commentPreview, postId) {
  if (!recipientUserId) return
  const email = await getUserEmail(recipientUserId)
  if (!email) return
  const actor = escapeHtml(actorDisplayName || 'Someone')
  const title = escapeHtml((postTitle || 'your post').slice(0, 100))
  const comment = escapeHtml((commentPreview || '').slice(0, 300))
  const link = `${FRONTEND_URL}/post/${postId}`
  return sendEmail(
    email,
    `${actor} commented on your post — Analytics Shorts`,
    `
      <p>${actor} commented on your post <strong>${title}</strong>.</p>
      ${comment ? `<p><em>${comment}${(commentPreview || '').length > 300 ? '…' : ''}</em></p>` : ''}
      <p><a href="${link}">View post</a></p>
      <p style="color:#888;font-size:12px;">You received this because you have an Analytics Shorts account.</p>
    `.trim().replace(/\n\s+/g, '\n')
  )
}

module.exports = {
  getUserEmail,
  sendEmail,
  sendNewMessageNotification,
  sendFollowNotification,
  sendLikeNotification,
  sendSaveNotification,
  sendCommentNotification
}
