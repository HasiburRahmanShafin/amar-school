import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as websiteApi from '../../api/websiteApi';
import * as galleryApi from '../../api/galleryApi';
import * as noticeApi from '../../api/noticeApi';
import LeafletMap from '../../components/LeafletMap';

function SchoolWebsite() {
  const { subdomain } = useParams();
  const [school, setSchool] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([
      websiteApi.getPublicWebsite(subdomain),
      galleryApi.getPublicGallery(subdomain),
      noticeApi.getPublicNotices(subdomain),
    ])
      .then(([websiteRes, galleryRes, noticeRes]) => {
        setSchool(websiteRes.data);
        setGallery(galleryRes.data);
        setNotices(noticeRes.data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [subdomain]);

  if (loading) return <div className="p-10 text-center">Loading school website...</div>;

  if (notFound || !school) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-2xl font-bold mb-2">School Not Found</h1>
        <p className="text-gray-500">
          This school either doesn't exist yet or is still pending Super Admin approval.
        </p>
      </div>
    );
  }

  const sortedCalendar = [...(school.academicCalendar || [])].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const directionsUrl =
    school.location?.lat && school.location?.lng
      ? `https://www.openstreetmap.org/directions?to=${school.location.lat}%2C${school.location.lng}`
      : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      {school.bannerUrl ? (
        <img src={school.bannerUrl} alt={`${school.name} banner`} className="w-full h-64 object-cover" />
      ) : (
        <div className="w-full h-64 bg-gradient-to-r from-blue-600 to-blue-800" />
      )}

      <div className="max-w-5xl mx-auto px-6 -mt-12">
        {/* Logo + name card */}
        <div className="bg-white rounded shadow p-6 flex items-center gap-4">
          {school.logoUrl && (
            <img src={school.logoUrl} alt="Logo" className="w-20 h-20 rounded-full object-cover border" />
          )}
          <h1 className="text-3xl font-bold">{school.name}</h1>
        </div>

        {/* Notices & Events - shown prominently near the top of the homepage */}
        {notices.length > 0 && (
          <section className="bg-white rounded shadow p-6 mt-6">
            <h2 className="font-semibold mb-4">Notices & Events</h2>
            <ul className="space-y-3">
              {notices.map((notice) => (
                <li
                  key={notice._id}
                  className={`border-l-4 pl-4 ${
                    notice.category === 'emergency' ? 'border-red-500' : 'border-blue-500'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{notice.title}</p>
                    <span className="text-xs text-gray-400">
                      {new Date(notice.startDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{notice.description}</p>
                  {notice.attachmentUrl && (
                    <a
                      href={notice.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 underline"
                    >
                      {notice.attachmentName || 'View attachment'}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Welcome message */}
        {school.welcomeMessage && (
          <section className="bg-white rounded shadow p-6 mt-6">
            <p className="text-gray-700 text-lg">{school.welcomeMessage}</p>
          </section>
        )}

        {/* Principal's message */}
        {school.principalMessage && (
          <section className="bg-white rounded shadow p-6 mt-6 border-l-4 border-blue-500">
            <h2 className="font-semibold mb-2">Message from the Principal</h2>
            <p className="text-gray-600 italic">{school.principalMessage}</p>
            {school.principalName && <p className="text-sm font-semibold mt-2">— {school.principalName}</p>}
          </section>
        )}

        {/* Photo gallery */}
        {gallery.length > 0 && (
          <section className="bg-white rounded shadow p-6 mt-6">
            <h2 className="font-semibold mb-4">Photo Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {gallery.map((img) => (
                <div key={img._id} className="rounded overflow-hidden">
                  <img src={img.imageUrl} alt={img.caption || img.category} className="w-full h-28 object-cover" />
                  {img.caption && <p className="text-xs text-gray-500 mt-1">{img.caption}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Academic calendar */}
        {sortedCalendar.length > 0 && (
          <section className="bg-white rounded shadow p-6 mt-6">
            <h2 className="font-semibold mb-4">Academic Calendar</h2>
            <ul className="space-y-3">
              {sortedCalendar.map((event, i) => (
                <li key={i} className="flex gap-4">
                  <span className="text-sm font-semibold text-blue-600 w-28 shrink-0">
                    {new Date(event.date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <div>
                    <p className="font-medium">{event.title}</p>
                    {event.description && <p className="text-sm text-gray-500">{event.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Contact + location */}
        <section className="bg-white rounded shadow p-6 mt-6 mb-10">
          <h2 className="font-semibold mb-4">Contact & Location</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Address:</strong> {school.address}</p>
              <p><strong>Phone:</strong> {school.phone}</p>
              <p><strong>Email:</strong> {school.email}</p>

              {school.socialLinks?.length > 0 && (
                <div className="pt-2">
                  {school.socialLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline mr-3"
                    >
                      {link.platform}
                    </a>
                  ))}
                </div>
              )}

              {directionsUrl && (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-3 bg-blue-600 text-white text-sm px-4 py-2 rounded"
                >
                  Get Directions
                </a>
              )}
            </div>

            {school.location?.lat && school.location?.lng && (
              <LeafletMap lat={school.location.lat} lng={school.location.lng} height="220px" />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default SchoolWebsite;
