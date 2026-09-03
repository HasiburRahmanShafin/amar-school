const OSRM_BASE = 'https://router.project-osrm.org';

export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => reject(new Error('Location permission denied - enable it to get directions')),
      { timeout: 10000 }
    );
  });
}

export async function getRoute(fromLat, fromLng, toLat, toLng) {
  // OSRM expects coordinates as lng,lat (reverse of the usual lat,lng order)
  const url = `${OSRM_BASE}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Could not calculate a route right now, please try again');
  }

  const data = await response.json();
  if (!data.routes || data.routes.length === 0) {
    throw new Error('No driving route found between these locations');
  }

  const route = data.routes[0];
  return {
    // GeoJSON gives [lng, lat] pairs - Leaflet's polyline wants [lat, lng]
    path: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm: (route.distance / 1000).toFixed(1),
    durationMin: Math.round(route.duration / 60),
  };
}
