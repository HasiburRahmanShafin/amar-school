import { Link } from 'react-router-dom';

export default function PublicFooter({ school }) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-6">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            {school?.logoUrl ? (
              <img src={school.logoUrl} alt={school?.name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                {school?.name?.[0] || 'S'}
              </div>
            )}
            <span className="font-bold text-white">{school?.name || 'School'}</span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Dedicated to fostering excellence in education through modern tools and a nurturing environment.
          </p>
        </div>

        {/* Quick links */}
        <div>
          <h3 className="text-white font-semibold text-sm mb-3">Quick Links</h3>
          <div className="space-y-2">
            <Link to="/login" className="block text-sm text-slate-400 hover:text-indigo-400 transition-colors">Staff Login</Link>
            {school?.subdomain && (
              <Link to={`/admission?subdomain=${school.subdomain}`} className="block text-sm text-slate-400 hover:text-indigo-400 transition-colors">
                Admissions
              </Link>
            )}
            <a href={`#notices`} className="block text-sm text-slate-400 hover:text-indigo-400 transition-colors">Notices</a>
            <a href={`#contact`} className="block text-sm text-slate-400 hover:text-indigo-400 transition-colors">Contact</a>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-white font-semibold text-sm mb-3">Contact</h3>
          <div className="space-y-2 text-sm text-slate-400">
            {school?.phone && <p>📞 {school.phone}</p>}
            {school?.email && <p>✉️ {school.email}</p>}
            {school?.address && <p>📍 {school.address}</p>}

            {/* Social links */}
            {school?.socialLinks?.length > 0 && (
              <div className="flex gap-3 pt-2">
                {school.socialLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-indigo-400 transition-colors font-medium text-xs"
                  >
                    {link.platform}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-6xl mx-auto px-6 pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2">
        <p className="text-xs text-slate-500">© {year} {school?.name}. All rights reserved.</p>
        <p className="text-xs text-slate-600">
          Powered by{' '}
          <span className="text-indigo-400 font-semibold">Amar School</span>
        </p>
      </div>
    </footer>
  );
}
