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

  // Base map with just the school marker, created/updated when coordinates change
  useEffect(() => {
    if (!containerRef.current || !schoolLat || !schoolLng) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current).setView([schoolLat, schoolLng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    L.marker([schoolLat, schoolLng]).addTo(map).bindPopup(schoolName || 'School');

    mapRef.current = map;
    setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 150);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [schoolLat, schoolLng, schoolName]);

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

  if (!schoolLat || !schoolLng) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5 text-center text-xs text-slate-500">
        School coordinates have not been configured yet.
      </div>
    );
  }

  const osmExternalUrl = `https://www.openstreetmap.org/directions?to=${schoolLat}%2C${schoolLng}`;

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        style={{ height: '260px', width: '100%', borderRadius: '12px' }}
        className="border border-slate-200 shadow-sm overflow-hidden"
      />

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={handleGetDirections}
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-2.5 px-4 rounded-lg shadow transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span>📍</span>
          <span>{loading ? 'Finding Route…' : 'Get Directions From My Location'}</span>
        </button>

        <a
          href={osmExternalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors"
          title="Open in OpenStreetMap"
        >
          <span>🗺️</span>
          <span>Open in OSM</span>
        </a>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs">
          {error}
          <div className="mt-1">
            <a href={osmExternalUrl} target="_blank" rel="noreferrer" className="underline font-semibold">
              Click here to navigate on openstreetmap.org instead
            </a>
          </div>
        </div>
      )}

      {route && (
        <div className="p-3 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 text-xs flex items-center justify-between">
          <span>🚗 Estimated Driving Distance:</span>
          <strong>{route.distanceKm} km ({route.durationMin} mins)</strong>
        </div>
      )}

      <p className="text-[11px] text-slate-400">
        OpenStreetMap & OSRM Navigation Assistant
      </p>
    </div>
  );
}

export default DirectionsPanel;
