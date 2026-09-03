import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { getCurrentLocation, getRoute } from '../api/directionsApi';

// Same Webpack marker-icon fix as LeafletMap.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Shows the school on a map plus a "Get Directions" button that geolocates
// the visitor, fetches a driving route from OSRM, and draws it in-app -
// replaces the old approach of linking out to openstreetmap.org/directions.
function DirectionsPanel({ schoolLat, schoolLng, schoolName }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const routeLayerRef = useRef(null);
  const userMarkerRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [route, setRoute] = useState(null); // { distanceKm, durationMin }

  // Base map with just the school marker, created once on mount
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map(containerRef.current).setView([schoolLat, schoolLng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    L.marker([schoolLat, schoolLng]).addTo(map).bindPopup(schoolName || 'School');

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 150);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGetDirections = async () => {
    setLoading(true);
    setError(null);

    try {
      const userLocation = await getCurrentLocation();
      const routeResult = await getRoute(userLocation.lat, userLocation.lng, schoolLat, schoolLng);

      const map = mapRef.current;

      // Clear a previous search's route/marker before drawing the new one
      if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
      if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);

      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng])
        .addTo(map)
        .bindPopup('Your location')
        .openPopup();

      routeLayerRef.current = L.polyline(routeResult.path, { color: '#2563eb', weight: 4 }).addTo(map);

      // Zoom/pan so the whole route is visible
      map.fitBounds(routeLayerRef.current.getBounds(), { padding: [30, 30] });

      setRoute(routeResult);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div ref={containerRef} style={{ height: '220px', width: '100%', borderRadius: '8px' }} />

      <button
        type="button"
        onClick={handleGetDirections}
        disabled={loading}
        className="w-full mt-3 bg-blue-600 text-white text-sm px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Finding route...' : 'Get Directions From My Location'}
      </button>

      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

      {route && (
        <p className="text-sm text-gray-600 mt-2">
          <strong>{route.distanceKm} km</strong> away — approx. {route.durationMin} min by car
        </p>
      )}

      <p className="text-[11px] text-gray-400 mt-2">
        Routing via OSRM's public demo server — a production deployment would use a
        self-hosted OSRM instance for reliability.
      </p>
    </div>
  );
}

export default DirectionsPanel;
