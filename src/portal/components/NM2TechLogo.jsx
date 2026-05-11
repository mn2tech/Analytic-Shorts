export default function NM2TechLogo({ size = 'md' }) {
  const dims = size === 'lg' ? 48 : size === 'sm' ? 28 : 36
  return (
    <div
      className="flex items-center justify-center rounded-lg bg-[#0078D4] text-white font-bold shadow"
      style={{ width: dims, height: dims }}
      aria-label="NM2TECH"
    >
      N
    </div>
  )
}

