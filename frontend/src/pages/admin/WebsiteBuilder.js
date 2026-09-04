import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as websiteApi from '../../api/websiteApi';
import { uploadImage } from '../../api/uploadApi';
import { searchAddress, reverseGeocode } from '../../api/geocodeApi';
import LeafletMap from '../../components/LeafletMap';

const emptyForm = {
  logoUrl: '',
  bannerUrl: '',
  welcomeMessage: '',
  principalName: '',
  principalMessage: '',
  address: '',
  phone: '',
  email: '',
  socialLinks: [],
  academicCalendar: [],
  location: { lat: null, lng: null, displayAddress: '' },
};

function WebsiteBuilder() {
  const [form, setForm] = useState(emptyForm);
  const [schoolName, setSchoolName] = useState('');
  const [subdomain, setSubdomain] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [addressQuery, setAddressQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Load the school's current website settings on page load
  useEffect(() => {
    websiteApi
      .getMySettings()
      .then((res) => {
        const school = res.data;
        setSchoolName(school.name);
        setSubdomain(school.subdomain);
        setForm({
          logoUrl: school.logoUrl || '',
          bannerUrl: school.bannerUrl || '',
          welcomeMessage: school.welcomeMessage || '',
          principalName: school.principalName || '',
          principalMessage: school.principalMessage || '',
          address: school.address || '',
          phone: school.phone || '',
          email: school.email || '',
          socialLinks: school.socialLinks || [],
          academicCalendar: (school.academicCalendar || []).map((event) => ({
            ...event,
            // Mongo returns full ISO dates - trim to YYYY-MM-DD for the <input type="date">
            date: event.date ? event.date.substring(0, 10) : '',
          })),
          location: school.location || { lat: null, lng: null, displayAddress: '' },
        });
      })
      .catch((err) => {
        setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load settings' });
      })
      .finally(() => setLoading(false));
  }, []);

  // ---- Image uploads ----
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadImage(file);
      setForm((prev) => ({ ...prev, logoUrl: url }));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const url = await uploadImage(file);
      setForm((prev) => ({ ...prev, bannerUrl: url }));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploadingBanner(false);
    }
  };

  // ---- Social links (dynamic list) ----
  const addSocialLink = () => {
    setForm((prev) => ({ ...prev, socialLinks: [...prev.socialLinks, { platform: '', url: '' }] }));
  };

  const updateSocialLink = (index, field, value) => {
    setForm((prev) => {
      const links = [...prev.socialLinks];
      links[index] = { ...links[index], [field]: value };
      return { ...prev, socialLinks: links };
    });
  };

  const removeSocialLink = (index) => {
    setForm((prev) => ({ ...prev, socialLinks: prev.socialLinks.filter((_, i) => i !== index) }));
  };

  // ---- Academic calendar (dynamic list) ----
  const addCalendarEvent = () => {
    setForm((prev) => ({
      ...prev,
      academicCalendar: [...prev.academicCalendar, { title: '', date: '', description: '' }],
    }));
  };

  const updateCalendarEvent = (index, field, value) => {
    setForm((prev) => {
      const events = [...prev.academicCalendar];
      events[index] = { ...events[index], [field]: value };
      return { ...prev, academicCalendar: events };
    });
  };

  const removeCalendarEvent = (index) => {
    setForm((prev) => ({
      ...prev,
      academicCalendar: prev.academicCalendar.filter((_, i) => i !== index),
    }));
  };

  // ---- Location (OpenStreetMap search + interactive pin) ----
  const handleSearchAddress = async (e) => {
    e.preventDefault();
    setSearching(true);
    setMessage(null);
    try {
      const result = await searchAddress(addressQuery);
      setForm((prev) => ({
        ...prev,
        location: result,
        address: prev.address || result.displayAddress,
      }));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSearching(false);
    }
  };

  const handleMapLocationChange = async (lat, lng) => {
    setForm((prev) => ({ ...prev, location: { ...prev.location, lat, lng } }));
    const addr = await reverseGeocode(lat, lng);
    if (addr) {
      setForm((prev) => ({
        ...prev,
        location: { ...prev.location, lat, lng, displayAddress: addr },
        address: prev.address || addr,
      }));
    }
  };

  // ---- Save everything ----
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await websiteApi.updateSettings(form);
      setMessage({ type: 'success', text: 'Website updated! Changes are now live on your school site.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save changes' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading website builder...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link to="/admin/dashboard" className="text-sm text-blue-600">&larr; Back to Dashboard</Link>
            <h1 className="text-2xl font-bold mt-1">Website Builder</h1>
            <p className="text-sm text-gray-500">
              Your live site: <span className="font-mono">{subdomain}.amarschool.com</span>{' '}
              <Link to={`/school/${subdomain}`} className="text-blue-600 underline">(preview)</Link>
            </p>
          </div>
          <Link
            to="/admin/gallery"
            className="bg-gray-800 text-white px-4 py-2 rounded text-sm h-fit"
          >
            Manage Photo Gallery &rarr;
          </Link>
        </div>

        {message && (
          <p
            className={`text-sm p-3 rounded mb-4 ${
              message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {message.text}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ---------------- FORM ---------------- */}
          <form onSubmit={handleSave} className="bg-white rounded shadow p-6 space-y-8">
            {/* Logo & Banner */}
            <section>
              <h2 className="font-semibold mb-3">Logo & Banner</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">School Logo</label>
                  {form.logoUrl && (
                    <img src={form.logoUrl} alt="Logo preview" className="w-20 h-20 object-cover rounded mb-2 border" />
                  )}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm" />
                  {uploadingLogo && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Banner Image</label>
                  {form.bannerUrl && (
                    <img src={form.bannerUrl} alt="Banner preview" className="w-full h-20 object-cover rounded mb-2 border" />
                  )}
                  <input type="file" accept="image/*" onChange={handleBannerUpload} className="text-sm" />
                  {uploadingBanner && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
                </div>
              </div>
            </section>

            {/* Welcome message & principal */}
            <section>
              <h2 className="font-semibold mb-3">Homepage Content</h2>
              <label className="block text-sm font-medium mb-1">Welcome Message</label>
              <textarea
                value={form.welcomeMessage}
                onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })}
                rows={3}
                className="w-full border rounded px-3 py-2 mb-4"
                placeholder="A warm welcome message shown on your homepage..."
              />

              <label className="block text-sm font-medium mb-1">Principal's Name</label>
              <input
                type="text"
                value={form.principalName}
                onChange={(e) => setForm({ ...form, principalName: e.target.value })}
                className="w-full border rounded px-3 py-2 mb-4"
              />

              <label className="block text-sm font-medium mb-1">Principal's Message</label>
              <textarea
                value={form.principalMessage}
                onChange={(e) => setForm({ ...form, principalMessage: e.target.value })}
                rows={3}
                className="w-full border rounded px-3 py-2"
              />
            </section>

            {/* Contact Details */}
            <section>
              <h2 className="font-semibold mb-3">Contact Details</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Campus Physical Address</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="e.g. House 12, Road 5, Dhanmondi, Dhaka"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm"
                      placeholder="e.g. +880 1712-345678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Official Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm"
                      placeholder="e.g. info@school.edu.bd"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Social links */}
            <section>
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold">Social Media Links</h2>
                <button type="button" onClick={addSocialLink} className="text-sm text-blue-600">+ Add link</button>
              </div>
              {form.socialLinks.map((link, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Platform (e.g. Facebook)"
                    value={link.platform}
                    onChange={(e) => updateSocialLink(index, 'platform', e.target.value)}
                    className="w-1/3 border rounded px-2 py-1 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="https://..."
                    value={link.url}
                    onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                    className="flex-1 border rounded px-2 py-1 text-sm"
                  />
                  <button type="button" onClick={() => removeSocialLink(index)} className="text-red-600 text-sm px-2">
                    Remove
                  </button>
                </div>
              ))}
              {form.socialLinks.length === 0 && <p className="text-sm text-gray-400">No social links added yet.</p>}
            </section>

            {/* Academic calendar */}
            <section>
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold">Academic Calendar</h2>
                <button type="button" onClick={addCalendarEvent} className="text-sm text-blue-600">+ Add event</button>
              </div>
              {form.academicCalendar.map((event, index) => (
                <div key={index} className="border rounded p-3 mb-2">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Event title (e.g. Mid-term Exam)"
                      value={event.title}
                      onChange={(e) => updateCalendarEvent(index, 'title', e.target.value)}
                      className="flex-1 border rounded px-2 py-1 text-sm"
                    />
                    <input
                      type="date"
                      value={event.date}
                      onChange={(e) => updateCalendarEvent(index, 'date', e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    />
                    <button type="button" onClick={() => removeCalendarEvent(index)} className="text-red-600 text-sm px-2">
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Short description (optional)"
                    value={event.description}
                    onChange={(e) => updateCalendarEvent(index, 'description', e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
              ))}
              {form.academicCalendar.length === 0 && (
                <p className="text-sm text-gray-400">No calendar events added yet.</p>
              )}
            </section>

            {/* Location */}
            <section>
              <h2 className="font-semibold mb-3">School Location</h2>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Search an address (e.g. Dhanmondi 27, Dhaka)"
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                  className="flex-1 border rounded px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={handleSearchAddress}
                  disabled={searching}
                  className="bg-gray-800 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                Or click / drag the pin directly on the map to fine-tune the exact spot.
              </p>
              <LeafletMap
                lat={form.location.lat}
                lng={form.location.lng}
                interactive
                onLocationChange={handleMapLocationChange}
                height="250px"
              />
              {form.location.displayAddress && (
                <p className="text-xs text-gray-500 mt-2">{form.location.displayAddress}</p>
              )}
            </section>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          {/* ---------------- LIVE PREVIEW ---------------- */}
          <div className="bg-white rounded shadow overflow-hidden h-fit sticky top-6">
            <p className="bg-gray-800 text-white text-xs text-center py-1">Live Preview</p>

            {form.bannerUrl ? (
              <img src={form.bannerUrl} alt="Banner" className="w-full h-40 object-cover" />
            ) : (
              <div className="w-full h-40 bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                No banner uploaded yet
              </div>
            )}

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                {form.logoUrl && <img src={form.logoUrl} alt="Logo" className="w-12 h-12 rounded-full object-cover" />}
                <h2 className="text-xl font-bold">{schoolName}</h2>
              </div>

              {form.welcomeMessage && <p className="text-gray-700 mb-4">{form.welcomeMessage}</p>}

              {form.principalName && (
                <div className="mb-4 border-l-4 border-blue-500 pl-3">
                  <p className="text-sm italic text-gray-600">{form.principalMessage}</p>
                  <p className="text-sm font-semibold mt-1">- {form.principalName}, Principal</p>
                </div>
              )}

              {form.socialLinks.length > 0 && (
                <div className="flex gap-3 mb-4 text-sm text-blue-600">
                  {form.socialLinks.map((link, i) => (
                    <span key={i}>{link.platform}</span>
                  ))}
                </div>
              )}

              {(form.address || form.phone || form.email) && (
                <div className="mb-4 p-3 bg-gray-50 rounded border text-xs text-gray-600 space-y-1">
                  <h4 className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">Contact Info</h4>
                  {form.address && <p><strong>Address:</strong> {form.address}</p>}
                  {form.phone && <p><strong>Phone:</strong> {form.phone}</p>}
                  {form.email && <p><strong>Email:</strong> {form.email}</p>}
                </div>
              )}

              {form.academicCalendar.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-sm mb-2">Upcoming on the Calendar</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {form.academicCalendar.map((event, i) => (
                      <li key={i}>
                        <strong>{event.date}</strong> — {event.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {form.location.lat && form.location.lng && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Location</h3>
                  <LeafletMap lat={form.location.lat} lng={form.location.lng} height="180px" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WebsiteBuilder;
