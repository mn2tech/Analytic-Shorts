/**
 * Real-time screen or tab recording using getDisplayMedia + MediaRecorder.
 * User chooses what to share (browser tab, window, or screen); we record until stop() is called.
 */

// Prefer MP4 so the recording opens in Windows (Movies & TV, Media Player); fall back to WebM.
function getPreferredMime() {
  const types = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

const WIDTH_9_16 = 1080
const HEIGHT_9_16 = 1920
const FPS_9_16 = 30

/**
 * Start real-time screen/tab recording.
 * @param {{ aspectRatio?: '9:16' }} opts - If aspectRatio is '9:16', output is cropped to 1080x1920 (Shorts).
 * @returns {Promise<{ stop: () => Promise<Blob>, stream: MediaStream }>}
 */
export async function startScreenRecording(opts = {}) {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Screen recording is not supported. Use Chrome, Edge, or Firefox and allow screen share.')
  }
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder is not supported in this browser.')
  }

  const use916 = opts.aspectRatio === '9:16'
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: use916
      ? { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } }
      : { width: { ideal: 1080 }, height: { ideal: 1920 }, frameRate: { ideal: 30 } },
    audio: false,
    preferCurrentTab: true,
  })

  if (!use916) {
    const mimeType = getPreferredMime()
    const options = mimeType ? { mimeType, videoBitsPerSecond: 6_000_000 } : { videoBitsPerSecond: 6_000_000 }
    let recorder
    try {
      recorder = new MediaRecorder(stream, options)
    } catch {
      recorder = new MediaRecorder(stream, { videoBitsPerSecond: 6_000_000 })
    }
    const chunks = []
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data)
    }
    recorder.start(2000)
    return {
      stream,
      stop() {
        return new Promise((resolve, reject) => {
          const done = () => {
            stream.getTracks().forEach((t) => t.stop())
            const mime = recorder.mimeType || mimeType || 'video/webm'
            const blob = chunks.length ? new Blob(chunks, { type: mime }) : null
            resolve(blob)
          }
          if (recorder.state === 'inactive') {
            done()
            return
          }
          recorder.onstop = done
          recorder.onerror = () => reject(new Error('Recording failed'))
          try {
            recorder.stop()
          } catch (e) {
            done()
          }
        })
      },
    }
  }

  // 9:16: pipe through canvas (center crop to 1080x1920), record canvas with requestFrame
  const video = document.createElement('video')
  video.autoplay = true
  video.muted = true
  video.playsInline = true
  video.srcObject = stream
  video.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;'
  document.body.appendChild(video)
  await new Promise((resolve, reject) => {
    video.onloadedmetadata = () => {
      video.play().then(resolve).catch(reject)
    }
    video.onerror = () => reject(new Error('Video failed to load'))
    setTimeout(resolve, 500)
  })

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH_9_16
  canvas.height = HEIGHT_9_16
  canvas.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    video.srcObject = null
    video.remove()
    stream.getTracks().forEach((t) => t.stop())
    throw new Error('Could not get canvas context for 9:16 recording.')
  }

  const canvasStream = canvas.captureStream(0)
  const track = canvasStream.getVideoTracks()[0]
  if (!track || typeof track.requestFrame !== 'function') {
    video.srcObject = null
    video.remove()
    canvas.remove()
    stream.getTracks().forEach((t) => t.stop())
    throw new Error('9:16 recording requires requestFrame support. Try Chrome or Edge.')
  }

  const mimeType = getPreferredMime()
  const options = mimeType ? { mimeType, videoBitsPerSecond: 6_000_000 } : { videoBitsPerSecond: 6_000_000 }
  let recorder
  try {
    recorder = new MediaRecorder(canvasStream, options)
  } catch {
    recorder = new MediaRecorder(canvasStream, { videoBitsPerSecond: 6_000_000 })
  }
  const chunks = []
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }
  recorder.start(2000)

  const frameInterval = 1000 / FPS_9_16
  let lastFrameTime = 0
  let rafId = null
  function drawFrame(now) {
    if (!rafId) return
    if (now - lastFrameTime >= frameInterval) {
      lastFrameTime = now
      const vw = video.videoWidth || 1
      const vh = video.videoHeight || 1
      const targetRatio = WIDTH_9_16 / HEIGHT_9_16
      const sourceRatio = vw / vh
      let sx = 0, sy = 0, sw = vw, sh = vh
      if (sourceRatio > targetRatio) {
        sw = vh * targetRatio
        sx = (vw - sw) / 2
      } else {
        sh = vw / targetRatio
        sy = (vh - sh) / 2
      }
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, WIDTH_9_16, HEIGHT_9_16)
      track.requestFrame()
    }
    rafId = requestAnimationFrame(drawFrame)
  }
  rafId = requestAnimationFrame(drawFrame)

  return {
    stream: canvasStream,
    stop() {
      return new Promise((resolve, reject) => {
        const done = () => {
          if (rafId != null) {
            cancelAnimationFrame(rafId)
            rafId = null
          }
          video.srcObject = null
          video.remove()
          try { canvas.remove() } catch (_) {}
          stream.getTracks().forEach((t) => t.stop())
          const mime = recorder.mimeType || mimeType || 'video/webm'
          const blob = chunks.length ? new Blob(chunks, { type: mime }) : null
          resolve(blob)
        }
        if (recorder.state === 'inactive') {
          done()
          return
        }
        recorder.onstop = done
        recorder.onerror = () => reject(new Error('Recording failed'))
        try {
          recorder.stop()
        } catch (e) {
          done()
        }
      })
    },
  }
}

/** Check if real-time screen recording is available. */
export function isScreenRecordingSupported() {
  return !!(typeof navigator !== 'undefined' && navigator.mediaDevices?.getDisplayMedia && typeof MediaRecorder !== 'undefined')
}
