// Turns a typed address into { lat, lng, displayAddress } using OpenStreetMap's
// free Nominatim geocoding API. No API key needed - just a descriptive
// User-Agent-equivalent (the "email" query param) as their usage policy asks for.
// Docs: https://nominatim.org/release-docs/latest/api/Search/

export async function searchAddress(query) {
  if (!query || !query.trim()) {
    throw new Error('Type an address to search');
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    query
  )}`;

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
