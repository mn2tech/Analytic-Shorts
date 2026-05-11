export default function NM2TechLogo({ className = '', size = 'lg' }) {
  const box = size === 'lg' ? 'h-14 w-14 text-2xl' : 'h-10 w-10 text-lg'
  return (
    <div className={`flex items-center justify-center rounded-xl bg-primary-600 text-white font-bold ${box} ${className}`}>
      N
    </div>
  )
}
