import { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface PickedLocation {
    lat: number;
    lng: number;
}

const DEFAULT_CENTER: [number, number] = [32.2211, 35.2544];

const pinIcon = L.divIcon({
    className: '',
    html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#111827;border:3px solid #fff;box-shadow:0 1px 6px rgba(15,23,42,.45)"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
});

interface DeliveryLocationMapProps {
    value: PickedLocation | null;
    onChange: (location: PickedLocation) => void;
    label: string;
}

function createMarker(
    map: L.Map,
    location: PickedLocation,
    onChange: (value: PickedLocation) => void,
) {
    const marker = L.marker([location.lat, location.lng], {
        icon: pinIcon,
        draggable: true,
    }).addTo(map);

    marker.on('dragend', () => {
        const point = marker.getLatLng();
        onChange({ lat: point.lat, lng: point.lng });
    });

    return marker;
}

export default function DeliveryLocationMap({ value, onChange, label }: DeliveryLocationMapProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const onChangeRef = useRef(onChange);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) return;

        const map = L.map(container, {
            center: value ? [value.lat, value.lng] : DEFAULT_CENTER,
            zoom: value ? 15 : 12,
            scrollWheelZoom: false,
        });

        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        if (value) {
            markerRef.current = createMarker(map, value, (location) =>
                onChangeRef.current(location),
            );
        }

        map.on('click', (event: L.LeafletMouseEvent) => {
            const location = { lat: event.latlng.lat, lng: event.latlng.lng };

            if (markerRef.current) {
                markerRef.current.setLatLng([location.lat, location.lng]);
            } else {
                markerRef.current = createMarker(map, location, (next) =>
                    onChangeRef.current(next),
                );
            }

            onChangeRef.current(location);
        });

        const frame = window.requestAnimationFrame(() => map.invalidateSize());
        const handleResize = () => map.invalidateSize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener('resize', handleResize);
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
        // The map is created once; the marker position is synchronised below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const map = mapRef.current;

        if (!map) return;

        if (!value) {
            markerRef.current?.remove();
            markerRef.current = null;

            return;
        }

        const marker = markerRef.current;

        if (!marker) {
            markerRef.current = createMarker(map, value, (location) =>
                onChangeRef.current(location),
            );
            map.setView([value.lat, value.lng], 15);

            return;
        }

        const current = marker.getLatLng();

        if (current.lat !== value.lat || current.lng !== value.lng) {
            marker.setLatLng([value.lat, value.lng]);
            map.panTo([value.lat, value.lng]);
        }
    }, [value]);

    return <div ref={containerRef} aria-label={label} className="h-64 w-full" />;
}
