import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Webpack breaks Leaflet's default marker icon paths - this is the standard fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Default center used only until a school picks its real location (Dhaka)
const DEFAULT_CENTER = { lat: 23.8103, lng: 90.4125 };

// interactive=true: admin can click the map or drag the pin to set location
// interactive=false: read-only display on the public school website
function LeafletMap({ lat, lng, interactive = false, onLocationChange, height = '300px' }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) return; // map already created, don't recreate on re-render

    const center = lat && lng ? [lat, lng] : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];
    const map = L.map(containerRef.current).setView(center, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker(center, { draggable: interactive }).addTo(map);

    if (interactive) {
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        if (onLocationChange) onLocationChange(pos.lat, pos.lng);
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        if (onLocationChange) onLocationChange(e.latlng.lat, e.latlng.lng);
      });
    }

    mapRef.current = map;
    markerRef.current = marker;

    // Leaflet sometimes renders at the wrong size inside flex/grid containers
    // until it's told to recheck - this nudge fixes that.
    setTimeout(() => map.invalidateSize(), 150);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If lat/lng change from outside (e.g. after an address search), move the pin
  useEffect(() => {
    if (mapRef.current && markerRef.current && lat && lng) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], 15);
    }
  }, [lat, lng]);

  return <div ref={containerRef} style={{ height, width: '100%', borderRadius: '8px' }} />;
}

export default LeafletMap;
