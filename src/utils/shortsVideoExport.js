import html2canvas from 'html2canvas'

function getSupportedMimeType(preferredFormat = 'webm') {
  const candidatesByFormat = {
    mp4: [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs=avc1.42E01E',
      'video/mp4',
    ],
    webm: [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ],
  }

  const fallbackOrder = preferredFormat === 'mp4' ? ['mp4', 'webm'] : ['webm', 'mp4']
  const candidates = fallbackOrder.flatMap((fmt) => candidatesByFormat[fmt] || [])

  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }

  return ''
}

export function getShortsExportCapabilities() {
  if (typeof MediaRecorder === 'undefined') {
    return { supported: false, formats: [] }
  }

  const can = (type) => {
    try {
      return MediaRecorder.isTypeSupported(type)
    } catch {
      return false
    }
  }

  const webm = can('video/webm;codecs=vp9') || can('video/webm;codecs=vp8') || can('video/webm')
  const mp4 =
    can('video/mp4;codecs=avc1.42E01E,mp4a.40.2') ||
    can('video/mp4;codecs=avc1.42E01E') ||
    can('video/mp4')

  const formats = []
  if (webm) formats.push('webm')
  if (mp4) formats.push('mp4')
  return { supported: formats.length > 0, formats }
}

function fitRect(srcW, srcH, dstW, dstH) {
  const scale = Math.max(dstW / srcW, dstH / srcH)
  const drawW = srcW * scale
  const drawH = srcH * scale
  const x = (dstW - drawW) / 2
  const y = (dstH - drawH) / 2
  return { x, y, drawW, drawH }
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function drawWatermark(ctx, width, height) {
  ctx.save()
  ctx.globalAlpha = 0.82
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)'
  drawRoundedRect(ctx, width - 450, 36, 390, 56, 16)
  ctx.fill()

  ctx.fillStyle = '#dbeafe'
  ctx.font = '600 24px Inter, system-ui, sans-serif'
  ctx.fillText('NM2TECH Analytics Shorts', width - 428, 71)
  ctx.restore()
}

function drawCursorOverlay(ctx, width, height, placement, cursor) {
  if (!cursor || typeof cursor.xRatio !== 'number' || typeof cursor.yRatio !== 'number') return

  const x = placement.x + placement.drawW * cursor.xRatio
  const y = placement.y + placement.drawH * cursor.yRatio

  ctx.save()
  ctx.globalAlpha = 0.95
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x, y, 14, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(x, y, 24, 0, Math.PI * 2)
  ctx.stroke()

  if (cursor.label) {
    const label = String(cursor.label).slice(0, 64)
    const textW = Math.min(520, 18 * label.length + 36)
    const boxX = Math.max(24, Math.min(width - textW - 24, x + 24))
    const boxY = Math.max(24, y - 54)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'
    drawRoundedRect(ctx, boxX, boxY, textW, 42, 12)
    ctx.fill()
    ctx.fillStyle = '#e2e8f0'
    ctx.font = '500 20px Inter, system-ui, sans-serif'
    ctx.fillText(label, boxX + 14, boxY + 28)
  }

  ctx.restore()
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v))
}

// Smooth easing for world-class transitions (ease-out for entrances, ease-in-out for segments)
function easeOutCubic(t) {
  return 1 - (1 - t) ** 3
}
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

function normalizeCropRect(cropRect) {
  if (!cropRect) return null
  const x = Number(cropRect.xRatio)
  const y = Number(cropRect.yRatio)
  const w = Number(cropRect.wRatio)
  const h = Number(cropRect.hRatio)
  if (![x, y, w, h].every((n) => Number.isFinite(n))) return null
  if (w <= 0 || h <= 0) return null
  return {
    xRatio: clamp01(x),
    yRatio: clamp01(y),
    wRatio: clamp01(w),
    hRatio: clamp01(h),
  }
}

function cropCanvas(sourceCanvas, cropRect) {
  const rect = normalizeCropRect(cropRect)
  if (!rect) return { canvas: sourceCanvas, rect: null }

  const sx = Math.round(sourceCanvas.width * rect.xRatio)
  const sy = Math.round(sourceCanvas.height * rect.yRatio)
  const sw = Math.max(1, Math.round(sourceCanvas.width * rect.wRatio))
  const sh = Math.max(1, Math.round(sourceCanvas.height * rect.hRatio))

  const cx = Math.max(0, Math.min(sourceCanvas.width - 1, sx))
  const cy = Math.max(0, Math.min(sourceCanvas.height - 1, sy))
  const cw = Math.max(1, Math.min(sourceCanvas.width - cx, sw))
  const ch = Math.max(1, Math.min(sourceCanvas.height - cy, sh))

  // If crop is effectively the whole canvas, skip creating a new canvas.
  if (cx === 0 && cy === 0 && cw === sourceCanvas.width && ch === sourceCanvas.height) {
    return { canvas: sourceCanvas, rect }
  }

  const out = document.createElement('canvas')
  out.width = cw
  out.height = ch
  const ctx = out.getContext('2d')
  if (!ctx) return { canvas: sourceCanvas, rect }
  ctx.drawImage(sourceCanvas, cx, cy, cw, ch, 0, 0, cw, ch)
  return { canvas: out, rect }
}

function transformCursorForCrop(cursor, cropRect) {
  const rect = normalizeCropRect(cropRect)
  if (!rect || !cursor) return cursor
  const x = (cursor.xRatio - rect.xRatio) / rect.wRatio
  const y = (cursor.yRatio - rect.yRatio) / rect.hRatio
  return {
    ...cursor,
    xRatio: clamp01(x),
    yRatio: clamp01(y),
  }
}

/** Return the element to use for scroll-stitch: the capture element if it scrolls, or a scrollable parent that is not the document (so we don't capture the whole page). */
function getScrollableElement(el) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return null
  const style = typeof getComputedStyle !== 'undefined' ? getComputedStyle(el) : null
  const overflowY = style ? style.overflowY : ''
  const overflow = style ? style.overflow : ''
  const scrollable =
    (overflowY === 'auto' || overflowY === 'scroll' || overflow === 'auto' || overflow === 'scroll') &&
    el.scrollHeight > el.clientHeight
  if (scrollable) return el
  let parent = el.parentElement
  while (parent && parent !== document.body) {
    const pStyle = getComputedStyle(parent)
    const pOy = pStyle.overflowY
    const pO = pStyle.overflow
    if ((pOy === 'auto' || pOy === 'scroll' || pO === 'auto' || pO === 'scroll') && parent.scrollHeight > parent.clientHeight) {
      return parent
    }
    parent = parent.parentElement
  }
  return null
}

const CAPTURE_OPTS = {
  backgroundColor: '#0f172a',
  scale: 2,
  useCORS: true,
  logging: false,
  allowTaint: false,
  imageTimeout: 15000,
}

/**
 * Capture full scrollable content by scrolling and stitching viewport captures.
 * So the video records the entire content even when the user has scrolled.
 */
async function captureFullScrollable(element, onProgress) {
  const scrollEl = getScrollableElement(element)
  const el = scrollEl || element
  const totalHeight = Math.max(1, el.scrollHeight || el.clientHeight || 1)
  const viewportHeight = Math.max(100, el.clientHeight || el.offsetHeight || 600)
  const needStitch = scrollEl && totalHeight > viewportHeight + 100

  if (!needStitch) {
    if (typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ block: 'start' })
      await new Promise((r) => setTimeout(r, 100))
    }
    return html2canvas(element, CAPTURE_OPTS)
  }

  const originalScrollTop = el.scrollTop
  const originalWindowScrollY = typeof window !== 'undefined' ? window.scrollY : 0
  const canvases = []
  const step = viewportHeight
  const maxSteps = Math.ceil(totalHeight / step) || 1
  let y = 0

  try {
    while (y < totalHeight) {
      if (el === document.documentElement && typeof window !== 'undefined') {
        window.scrollTo(0, y)
      } else {
        el.scrollTop = y
      }
      await new Promise((r) => setTimeout(r, 120))
      const target = el === document.documentElement ? document.body : el
      const canvas = await html2canvas(target, CAPTURE_OPTS)
      canvases.push(canvas)
      if (typeof onProgress === 'function') {
        try {
          onProgress(canvases.length / maxSteps)
        } catch (_) {}
      }
      y += step
    }
  } finally {
    if (el === document.documentElement && typeof window !== 'undefined') {
      window.scrollTo(0, originalWindowScrollY)
    } else {
      el.scrollTop = originalScrollTop
    }
  }

  if (canvases.length === 0) {
    return html2canvas(element, CAPTURE_OPTS)
  }
  if (canvases.length === 1) {
    return canvases[0]
  }

  const w = canvases[0].width
  let totalH = 0
  for (const c of canvases) totalH += c.height
  const stitched = document.createElement('canvas')
  stitched.width = w
  stitched.height = totalH
  const sCtx = stitched.getContext('2d')
  if (!sCtx) return canvases[0]
  let drawY = 0
  for (const canvas of canvases) {
    sCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, drawY, w, canvas.height)
    drawY += canvas.height
  }
  return stitched
}

function drawIntroScene(ctx, width, height, title, subtitle, highlight, progress) {
  const eased = easeOutCubic(clamp01(progress))
  const grd = ctx.createLinearGradient(0, 0, width, height)
  grd.addColorStop(0, '#0b1220')
  grd.addColorStop(1, '#1e3a8a')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, width, height)

  const alpha = Math.min(1, eased * 1.2)
  ctx.globalAlpha = alpha

  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  drawRoundedRect(ctx, 80, 200, width - 160, height - 400, 36)
  ctx.fill()

  ctx.fillStyle = '#bfdbfe'
  ctx.font = '600 52px Inter, system-ui, sans-serif'
  ctx.fillText('NM2TECH Analytics Shorts', 120, 360)

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 76px Inter, system-ui, sans-serif'
  const safeTitle = String(title || 'Dashboard Story')
  const firstLine = safeTitle.length > 30 ? `${safeTitle.slice(0, 30)}...` : safeTitle
  ctx.fillText(firstLine, 120, 500)

  ctx.fillStyle = '#dbeafe'
  ctx.font = '500 40px Inter, system-ui, sans-serif'
  if (subtitle) ctx.fillText(subtitle, 120, 600)
  if (highlight) ctx.fillText(highlight, 120, 670)

  ctx.fillStyle = '#93c5fd'
  ctx.font = '500 34px Inter, system-ui, sans-serif'
  ctx.fillText('Auto-generated dashboard short', 120, height - 150)

  ctx.globalAlpha = 1
  drawWatermark(ctx, width, height)
}

function drawDashboardScene(ctx, width, height, screenshotCanvas, progress, cursor) {
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, width, height)

  const { x, y, drawW, drawH } = fitRect(screenshotCanvas.width, screenshotCanvas.height, width, height)
  const zoomProgress = easeInOutCubic(clamp01(progress))
  const zoom = cursor ? 1 : 1 + zoomProgress * 0.06
  const scaledW = drawW * zoom
  const scaledH = drawH * zoom
  const px = x - (scaledW - drawW) / 2
  const py = y - (scaledH - drawH) / 2

  ctx.drawImage(screenshotCanvas, px, py, scaledW, scaledH)

  ctx.fillStyle = 'rgba(15, 23, 42, 0.24)'
  ctx.fillRect(0, 0, width, height)
  drawCursorOverlay(ctx, width, height, { x: px, y: py, drawW: scaledW, drawH: scaledH }, cursor)
  drawWatermark(ctx, width, height)
}

function drawOutroScene(ctx, width, height, title, callToAction, progress) {
  const eased = easeOutCubic(clamp01(progress))
  const alpha = Math.min(1, eased * 1.2)
  ctx.fillStyle = '#111827'
  ctx.fillRect(0, 0, width, height)
  ctx.globalAlpha = alpha

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 70px Inter, system-ui, sans-serif'
  ctx.fillText('Ready to Share', 120, 760)

  ctx.fillStyle = '#93c5fd'
  ctx.font = '500 38px Inter, system-ui, sans-serif'
  ctx.fillText(String(title || 'Analytics Dashboard'), 120, 840)

  ctx.fillStyle = '#d1d5db'
  ctx.fillText('Built with NM2TECH Analytics Shorts', 120, 920)
  if (callToAction) {
    ctx.fillStyle = '#60a5fa'
    ctx.font = '600 34px Inter, system-ui, sans-serif'
    ctx.fillText(callToAction, 120, 1000)
  }
  ctx.globalAlpha = 1
  drawWatermark(ctx, width, height)
}

const ABORT_ERR_MSG = 'Recording was cancelled.'

export async function createDashboardShortVideo({
  title,
  subtitle,
  highlight,
  callToAction = 'Follow for more analytics updates',
  format = 'webm',
  durationSeconds = 15,
  captureElement,
  storyFrames = [],
  cropRect = null,
  onProgress = null,
  signal = null,
}) {
  if (!captureElement) {
    throw new Error('No dashboard content found to capture.')
  }
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder is not supported in this browser.')
  }

  const report = (phase, progress) => {
    if (typeof onProgress === 'function') {
      try {
        onProgress(phase, clamp01(progress))
      } catch (_) {}
    }
  }

  report('Preparing', 0)

  const hasStoryFrames = Array.isArray(storyFrames) && storyFrames.length > 0
  const screenshotCanvasRaw = hasStoryFrames
    ? storyFrames[0].canvas
    : await captureFullScrollable(captureElement, (p) => report('Preparing', p * 0.95))
  if (signal?.aborted) throw new Error(ABORT_ERR_MSG)

  const { canvas: screenshotCanvas } = cropCanvas(screenshotCanvasRaw, cropRect)

  const width = 1080
  const height = 1920
  const fps = 30
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    throw new Error('Could not initialize video canvas.')
  }

  if (typeof canvas.captureStream !== 'function') {
    canvas.remove()
    throw new Error('Video capture is not supported in this browser (canvas.captureStream missing).')
  }

  const streamForManual = canvas.captureStream(0)
  const trackForManual = streamForManual.getVideoTracks()[0]
  const useManualFrames = trackForManual && typeof trackForManual.requestFrame === 'function'
  const stream = useManualFrames ? streamForManual : canvas.captureStream(fps)
  const videoTrack = stream.getVideoTracks()[0]
  const mimeType = getSupportedMimeType(format)
  if (!mimeType) {
    try { canvas.remove() } catch (_) {}
    throw new Error('This browser does not support short video export for the selected format.')
  }
  const videoBitsPerSecond = 12_000_000
  const optionsWithMime = { mimeType, videoBitsPerSecond }
  const optionsWithoutMime = { videoBitsPerSecond }
  const chunks = []

  let recorder
  try {
    recorder = new MediaRecorder(stream, optionsWithMime)
  } catch (err) {
    // Some browsers claim support but still throw; retry without mimeType to let browser choose.
    try {
      recorder = new MediaRecorder(stream, optionsWithoutMime)
    } catch (err2) {
      const msg = err2?.message || err?.message || 'Failed to initialize MediaRecorder'
      throw new Error(`Video recording failed to start. ${msg}`)
    }
  }
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data)
    }
  }

  const finished = new Promise((resolve) => {
    recorder.onstop = () => {
      const outputMime = mimeType || 'video/webm'
      resolve(new Blob(chunks, { type: outputMime }))
    }
  })

  const totalMs = Math.max(5, Number(durationSeconds || 15)) * 1000
  const introMs = Math.round(totalMs * 0.2)
  const outroMs = Math.round(totalMs * 0.15)
  const bodyMs = Math.max(500, totalMs - introMs - outroMs)
  const totalFrames = Math.ceil((totalMs / 1000) * fps)
  const frameDurationMs = 1000 / fps

  const processedStoryFrames = hasStoryFrames
    ? storyFrames.map((f) => {
        const { canvas } = cropCanvas(f.canvas, cropRect)
        return {
          canvas,
          cursor: transformCursorForCrop(f.cursor || null, cropRect),
        }
      })
    : []

  recorder.start(1000)

  const renderFrame = (elapsed) => {
    if (elapsed <= introMs) {
      const p = introMs > 0 ? elapsed / introMs : 1
      report('Intro', p)
      drawIntroScene(ctx, width, height, title, subtitle, highlight, p)
    } else if (elapsed <= introMs + bodyMs) {
      const bodyProgress = bodyMs > 0 ? (elapsed - introMs) / bodyMs : 1
      report('Dashboard', bodyProgress)
      if (hasStoryFrames) {
        const idx = Math.min(
          processedStoryFrames.length - 1,
          Math.floor(bodyProgress * processedStoryFrames.length)
        )
        const frame = processedStoryFrames[idx] || {}
        drawDashboardScene(ctx, width, height, frame.canvas || screenshotCanvas, bodyProgress, frame.cursor || null)
      } else {
        drawDashboardScene(ctx, width, height, screenshotCanvas, bodyProgress, null)
      }
    } else {
      const outroP = outroMs > 0 ? Math.min(1, (elapsed - introMs - bodyMs) / outroMs) : 1
      report('Outro', outroP)
      drawOutroScene(ctx, width, height, title, callToAction, outroP)
    }
  }

  await new Promise((resolve, reject) => {
    let settled = false
    const done = (fn) => {
      if (settled) return
      settled = true
      fn()
    }

    if (useManualFrames) {
      let frameIndex = 0
      function drawOneFrame() {
        if (signal?.aborted) {
          try {
            if (recorder.state === 'recording') recorder.stop()
          } catch (_) {}
          done(() => reject(new Error(ABORT_ERR_MSG)))
          return
        }
        const elapsed = frameIndex * frameDurationMs
        report('Rendering video', Math.min(1, frameIndex / totalFrames))
        if (frameIndex >= totalFrames) {
          drawOutroScene(ctx, width, height, title, callToAction, 1)
          videoTrack.requestFrame()
          done(resolve)
          return
        }
        renderFrame(elapsed)
        videoTrack.requestFrame()
        frameIndex++
        setTimeout(drawOneFrame, frameDurationMs)
      }
      report('Rendering video', 0)
      setTimeout(drawOneFrame, 0)
    } else {
      const renderStart = performance.now()
      const draw = (now) => {
        if (signal?.aborted) {
          try {
            if (recorder.state === 'recording') recorder.stop()
          } catch (_) {}
          done(() => reject(new Error(ABORT_ERR_MSG)))
          return
        }
        const elapsed = now - renderStart
        report('Rendering video', Math.min(1, elapsed / totalMs))
        if (elapsed >= totalMs) {
          drawOutroScene(ctx, width, height, title, callToAction, 1)
          done(resolve)
          return
        }
        renderFrame(elapsed)
        requestAnimationFrame(draw)
      }
      report('Rendering video', 0)
      requestAnimationFrame(draw)
    }
  })

  await new Promise((resolve) => setTimeout(resolve, 250))

  // Hard stop + hard finish timeout to avoid “never completes” hangs.
  // (Some environments never fire onstop reliably.)
  const finishTimeoutMs = Math.max(6000, totalMs + 8000)
  const hardStopTimer = setTimeout(() => {
    try {
      if (recorder && recorder.state !== 'inactive') {
        recorder.requestData?.()
        recorder.stop()
      }
    } catch {
      // ignore
    }
  }, 1500)

  try {
    if (recorder && recorder.state !== 'inactive') {
      recorder.requestData?.()
      recorder.stop()
    }
  } catch {
    // ignore
  }

  const blob = await Promise.race([
    finished,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Video recording timed out. Please try again (WebM is more reliable than MP4).')), finishTimeoutMs)
    ),
  ])

  clearTimeout(hardStopTimer)
  try {
    canvas.remove()
  } catch (_) {}
  return blob
}

export function downloadVideoBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Delay revoke to avoid interrupting downloads in some browsers.
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
  }, 15000)
}

// Chromium-only (Chrome/Edge) “Save As…” picker to bypass OneDrive download folders.
export async function saveVideoBlobAs(blob, filename) {
  if (typeof window === 'undefined' || typeof window.showSaveFilePicker !== 'function') return false

  const ext = getVideoFileExtension(blob)
  const suggestedName = filename || `analytics-short.${ext}`
  const type = String(blob?.type || '').toLowerCase()

  const accept = {}
  if (type.includes('mp4')) accept['video/mp4'] = ['.mp4']
  if (type.includes('webm')) accept['video/webm'] = ['.webm']
  if (!Object.keys(accept).length) {
    // Provide common fallbacks so picker offers sensible filters.
    accept['video/webm'] = ['.webm']
    accept['video/mp4'] = ['.mp4']
  }

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{ description: 'Video', accept }],
      excludeAcceptAllOption: false,
    })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return true
  } catch (err) {
    // User cancelled (AbortError) or picker unsupported in context.
    return false
  }
}

export function getVideoFileExtension(blob) {
  const type = String(blob?.type || '').toLowerCase()
  if (type.includes('mp4')) return 'mp4'
  if (type.includes('webm')) return 'webm'
  return 'webm'
}

