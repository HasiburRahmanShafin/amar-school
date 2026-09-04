// Turns a typed address into { lat, lng, displayAddress } using OpenStreetMap's
// free Nominatim geocoding API. No API key needed - just a descriptive
// User-Agent-equivalent (the "email" query param) as their usage policy asks for.
// Docs: https://nominatim.org/release-docs/latest/api/Search/

const NOMINATIM_EMAIL = 'support@amarschool.com';

export async function searchAddress(query) {
  if (!query || !query.trim()) {
    throw new Error('Type an address to search');
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    query
  )}&email=${encodeURIComponent(NOMINATIM_EMAIL)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Location search failed, please try again');
  }

  const results = await response.json();
  if (!results.length) {
    throw new Error('No matching location found - try a more specific address');
  }

  const result = results[0];
  return {
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    displayAddress: result.display_name,
  };
}

// Reverse geocodes coordinates into a human-readable address string
export async function reverseGeocode(lat, lng) {
  if (!lat || !lng) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&email=${encodeURIComponent(
      NOMINATIM_EMAIL
    )}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data.display_name || null;
  } catch (err) {
    console.warn('Reverse geocoding failed:', err);
    return null;
  }
}
