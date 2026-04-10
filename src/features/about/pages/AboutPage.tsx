import { ThunderboltFilled } from '@ant-design/icons'

export function AboutPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-12 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-blue-50/50 rounded-full blur-3xl -z-10" />

      <div className="text-center max-w-3xl mx-auto px-4">
        {/* Logo Section */}
        <div className="mb-10 relative inline-flex justify-center items-center group">
          <div className="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="relative p-4">
            <ThunderboltFilled className="text-6xl text-slate-800 drop-shadow-sm transform group-hover:scale-110 group-hover:text-blue-600 transition-all duration-300 ease-out" />
          </div>
        </div>

        {/* Title Section */}
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-8 tracking-tight">
          关于
          <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-cyan-500">
            本项目
          </span>
        </h1>

        {/* Content Section */}
        <div className="space-y-8 text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
          <p>一个简单的 React SPA Starter。</p>
        </div>
      </div>
    </div>
  )
}
