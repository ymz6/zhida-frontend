import reactLogo from '@/assets/react.svg'
import { PlusOutlined } from '@ant-design/icons'
import viteLogo from '/vite.svg'

export function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-12 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-blue-50/50 rounded-full blur-3xl -z-10" />

      <div className="text-center max-w-3xl mx-auto px-4">
        {/* Logo Section */}
        <div className="mb-10 flex items-center justify-center gap-8 md:gap-12 group">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <img
              src={viteLogo}
              alt="Vite logo"
              className="relative w-20 h-20 md:w-24 md:h-24 drop-shadow-sm transform hover:scale-110 transition-transform duration-300 ease-out"
            />
          </div>

          <PlusOutlined className="text-3xl text-slate-300/80" />

          <div className="relative">
            <div className="absolute inset-0 bg-cyan-400/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-100" />
            <img
              src={reactLogo}
              alt="React logo"
              className="relative w-20 h-20 md:w-24 md:h-24 drop-shadow-sm transform hover:scale-110 hover:rotate-360 transition-all duration-1000 ease-in-out motion-safe:animate-[spin_20s_linear_infinite]"
            />
          </div>
        </div>

        {/* Title Section */}
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight">
          React{' '}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-cyan-500">
            Frontend Starter
          </span>
        </h1>
      </div>
    </div>
  )
}
