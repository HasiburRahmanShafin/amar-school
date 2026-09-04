import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as websiteApi from '../../api/websiteApi';
import * as galleryApi from '../../api/galleryApi';
import * as noticeApi from '../../api/noticeApi';
import * as routineApi from '../../api/routineApi';
import DirectionsPanel from '../../components/DirectionsPanel';

const DAY_LABELS = {
  saturday: 'Saturday',
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
};

function SchoolWebsite() {
  const { subdomain } = useParams();
  const [school, setSchool] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [galleryCategory, setGalleryCategory] = useState('all');
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Class routine - a visitor first picks which class/section they want to
  // see, so this is fetched separately from the rest of the homepage data.
  const [routineClasses, setRoutineClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [routines, setRoutines] = useState([]);
  const [routineLoading, setRoutineLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      websiteApi.getPublicWebsite(subdomain),
      galleryApi.getPublicGallery(subdomain),
      noticeApi.getPublicNotices(subdomain),
      routineApi.getPublicRoutine(subdomain),
    ])
      .then(([websiteRes, galleryRes, noticeRes, routineRes]) => {
        setSchool(websiteRes.data);
        setGallery(galleryRes.data);
        setNotices(noticeRes.data);
        setRoutineClasses(routineRes.data.classes);
        if (routineRes.data.classes.length > 0) {
          const first = routineRes.data.classes[0];
          setSelectedClass(`${first.className}||${first.section}`);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [subdomain]);
  useEffect(() => {
    if (!selectedClass) return;
    const [className, section] = selectedClass.split('||');
    setRoutineLoading(true);
    routineApi
      .getPublicRoutine(subdomain, { className, section })
      .then((res) => setRoutines(res.data.routines))
      .catch(() => setRoutines([]))
      .finally(() => setRoutineLoading(false));
  }, [subdomain, selectedClass]);

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

        {/* Class Routine */}
        {routineClasses.length > 0 && (
          <section className="bg-white rounded shadow p-6 mt-6">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h2 className="font-semibold">Class Routine</h2>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm"
              >
                {routineClasses.map((c) => (
                  <option key={`${c.className}||${c.section}`} value={`${c.className}||${c.section}`}>
                    {c.className} - Section {c.section}
                  </option>
                ))}
              </select>
            </div>

            {routineLoading ? (
              <p className="text-sm text-gray-500">Loading routine...</p>
            ) : routines.length === 0 ? (
              <p className="text-sm text-gray-500">No routine published for this class yet.</p>
            ) : (
              <div className="space-y-5">
                {routines.map((routine) => (
                  <div key={routine._id}>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium text-sm">
                        {routine.scheduleType === 'regular'
                          ? DAY_LABELS[routine.dayOfWeek]
                          : new Date(routine.effectiveDate).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                      </p>
                      {routine.scheduleType === 'special' && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                          {routine.label || 'Special schedule'}
                        </span>
                      )}
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-400">
                          <th className="pr-3 py-1 font-normal">#</th>
                          <th className="pr-3 py-1 font-normal">Subject</th>
                          <th className="pr-3 py-1 font-normal">Teacher</th>
                          <th className="pr-3 py-1 font-normal">Time</th>
                          <th className="pr-3 py-1 font-normal">Room</th>
                        </tr>
                      </thead>
                      <tbody>
                        {routine.periods.map((period, i) => (
                          <tr key={i} className="border-t border-gray-50">
                            <td className="pr-3 py-1">{period.periodNumber}</td>
                            <td className="pr-3 py-1">{period.subject}</td>
                            <td className="pr-3 py-1">{period.teacherName}</td>
                            <td className="pr-3 py-1">
                              {period.startTime} - {period.endTime}
                            </td>
                            <td className="pr-3 py-1">{period.classroom || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="font-semibold text-lg">Photo Gallery</h2>
                <p className="text-xs text-gray-500">Showcasing campus facilities, events, and student activities</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'All Photos' },
                  { id: 'facilities', label: 'Campus Facilities' },
                  { id: 'events', label: 'Events' },
                  { id: 'activities', label: 'Student Activities' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setGalleryCategory(cat.id)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                      galleryCategory === cat.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              const visibleImages =
                galleryCategory === 'all'
                  ? gallery
                  : gallery.filter((img) => (img.category || '').toLowerCase() === galleryCategory);

              if (visibleImages.length === 0) {
                return (
                  <p className="text-xs text-gray-400 py-6 text-center">
                    No photos found in this category.
                  </p>
                );
              }

              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {visibleImages.map((img) => (
                    <div key={img._id} className="rounded-lg overflow-hidden border bg-gray-50 shadow-sm group">
                      <img
                        src={img.imageUrl}
                        alt={img.caption || img.category}
                        className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="p-2 bg-white">
                        <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                          {img.category || 'General'}
                        </span>
                        {img.caption && <p className="text-xs text-gray-600 truncate mt-0.5">{img.caption}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
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

        {/* Contact + location with OpenStreetMap Navigation */}
        <section className="bg-white rounded shadow p-6 mt-6 mb-10">
          <h2 className="font-semibold mb-4 text-lg">Contact & Location</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-sm text-gray-600 space-y-3">
              <div className="p-4 bg-gray-50 rounded-xl space-y-2 border">
                <p><strong>Address:</strong> {school.address}</p>
                <p><strong>Phone:</strong> {school.phone}</p>
                <p><strong>Email:</strong> {school.email}</p>
              </div>

              {school.socialLinks?.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Connect With Us</h3>
                  <div className="flex flex-wrap gap-2">
                    {school.socialLinks.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors"
                      >
                        {link.platform}
                      </a>
                    ))}
                  </div>
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

            <div>
              <DirectionsPanel
                schoolLat={school.location?.lat}
                schoolLng={school.location?.lng}
                schoolName={school.name}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default SchoolWebsite;
