import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Bin } from '../api';

interface FacilityMapProps {
  bins: Bin[];
  selectedBin: Bin | null;
  onSelectBin: (bin: Bin) => void;
}

export const FacilityMap: React.FC<FacilityMapProps> = ({ bins, selectedBin, onSelectBin }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: number]: L.Marker }>({});
  const routeLayerRef = useRef<L.Polyline | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on average coords or default
    const defaultLat = 12.682;
    const defaultLng = 77.447;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([defaultLat, defaultLng], 16);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // OpenStreetMap clean tiles (no API key required, crisp and reliable)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers and route whenever bins change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || bins.length === 0) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    const bounds = L.latLngBounds([]);

    // Sort bins for nearest route preview among high fill bins
    const urgentBins = bins.filter((b) => {
      const pct = b.capacity_liters > 0 ? (b.fill_level / b.capacity_liters) * 100 : b.fill_level;
      return pct >= 70 || b.overflow_risk;
    });
    const routeCoords: [number, number][] = [];

    bins.forEach((bin) => {
      const lat = bin.latitude;
      const lng = bin.longitude;
      bounds.extend([lat, lng]);

      const fillPct =
        bin.capacity_liters > 0
          ? Math.min(100, Math.max(0, Math.round((bin.fill_level / bin.capacity_liters) * 100)))
          : Math.min(100, Math.max(0, Math.round(bin.fill_level)));

      let color = 'var(--color-primary-500)'; // Green
      if (fillPct >= 80 || bin.overflow_risk) {
        color = 'var(--color-error)'; // Red
      } else if (fillPct >= 50) {
        color = 'var(--color-warning)'; // Amber
      }

      const isSelected = selectedBin?.id === bin.id;

      // Custom HTML Marker Icon
      const iconHtml = `
        <div class="map-marker-pin ${isSelected ? 'marker-selected' : ''} ${
          bin.overflow_risk ? 'marker-pulse' : ''
        }" style="--marker-color: ${color};">
          <div class="marker-core">
            <span class="marker-fill">${fillPct}%</span>
          </div>
          <div class="marker-label">${bin.name}</div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: iconHtml,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        onSelectBin(bin);
      });

      markersRef.current[bin.id] = marker;
    });

    // Draw route for urgent bins
    if (urgentBins.length > 1) {
      urgentBins.forEach((b) => routeCoords.push([b.latitude, b.longitude]));
      routeLayerRef.current = L.polyline(routeCoords, {
        color: '#E07B39',
        weight: 3,
        opacity: 0.85,
        dashArray: '6, 8',
      }).addTo(map);
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }
  }, [bins, selectedBin, onSelectBin]);

  // Pan to selected bin
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedBin) return;
    map.panTo([selectedBin.latitude, selectedBin.longitude], {
      animate: true,
      duration: 0.5,
    });
  }, [selectedBin]);

  return (
    <div className="map-wrapper">
      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#2D6A4F' }}></span>
          <span>Normal (&lt;50%)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#E07B39' }}></span>
          <span>Elevated (50-80%)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#C0392B' }}></span>
          <span>Critical / At Risk</span>
        </div>
        <div className="legend-item">
          <span className="legend-line"></span>
          <span>Truck Collection Route</span>
        </div>
      </div>
      <div ref={mapContainerRef} className="leaflet-map-element" />
    </div>
  );
};
