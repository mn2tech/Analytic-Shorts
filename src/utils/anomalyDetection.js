export function clampContamination(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0.05
  return Math.min(0.2, Math.max(0.01, numeric))
}

// Sensitivity is a user-friendly 1..100 slider.
export function sensitivityToContamination(sensitivity) {
  const s = Math.min(100, Math.max(1, Number(sensitivity) || 50))
  const min = 0.01
  const max = 0.2
  const mapped = min + ((s - 1) / 99) * (max - min)
  return Number(mapped.toFixed(4))
}

export function contaminationToSensitivity(contamination) {
  const c = clampContamination(contamination)
  const min = 0.01
  const max = 0.2
  const ratio = (c - min) / (max - min)
  return Math.round(1 + ratio * 99)
}
