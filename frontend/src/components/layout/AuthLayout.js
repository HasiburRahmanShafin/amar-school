export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 relative overflow-hidden auth-gradient flex-col justify-between p-12">
        {/* Decorative circles */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/5" />
          <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 left-1/4 w-64 h-64 rounded-full bg-white/8" />
        </div>

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Amar School</span>
        </div>

        {/* Headline */}
        <div className="relative z-10">
          <h2 className="text-white text-4xl font-bold leading-tight mb-4">
            Empowering<br />Education<br />with Technology
          </h2>
          <p className="text-indigo-200 text-base leading-relaxed max-w-sm">
            Manage students, teachers, admissions, notices, and your school's public website — all in one place.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-8">
            {['Student Management', 'Teacher Profiles', 'Admission System', 'Class Routines', 'Public Website'].map((f) => (
              <span key={f} className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/15 text-white/90 backdrop-blur-sm">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer tagline */}
        <p className="relative z-10 text-indigo-300 text-xs">
          © {new Date().getFullYear()} Amar School — All rights reserved
        </p>
      </div>

      {/* Right — form area */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span className="font-bold text-lg text-slate-800 dark:text-white">Amar School</span>
          </div>

          {(title || subtitle) && (
            <div className="mb-8">
              {title && <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{title}</h1>}
              {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}
