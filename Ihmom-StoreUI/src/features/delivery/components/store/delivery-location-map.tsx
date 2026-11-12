import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { Button } from '@/shared/components/ui/button.tsx';

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
    onChange: (location: PickedLocation) => void,
) {
    const marker = L.marker([location.lat, location.lng], {
        icon: pinIcon,
        draggable: true,
    }).addTo(map);

    marker.on('dragend', () => {
        const position = marker.getLatLng();

        onChange({
            lat: position.lat,
            lng: position.lng,
        });
    });

    return marker;
}

export default function DeliveryLocationMap({ value, onChange, label }: DeliveryLocationMapProps) {
    const { t } = useTranslation('support');

    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const onChangeRef = useRef(onChange);
    const mountedRef = useRef(false);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
        };
    }, []);

    function updateLocation(location: PickedLocation) {
        setLocationError(null);
        onChangeRef.current(location);
    }

    function requestCurrentLocation() {
        if (!navigator.geolocation) {
            setLocationError(t('contact.form.location.errors.unsupported'));
            return;
        }

        if (!window.isSecureContext) {
            setLocationError(t('contact.form.location.errors.insecure'));
            return;
        }

        setIsLocating(true);
        setLocationError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                if (!mountedRef.current) return;

                updateLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });

                setIsLocating(false);
            },
            (error) => {
                if (!mountedRef.current) return;

                const errorKey =
                    error.code === 1
                        ? 'permissionDenied'
                        : error.code === 2
                          ? 'unavailable'
                          : 'timeout';

                setLocationError(t(`contact.form.location.errors.${errorKey}`));
                setIsLocating(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            },
        );
    }

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
            markerRef.current = createMarker(map, value, updateLocation);
        }

        map.on('click', (event) => {
            const location = {
                lat: event.latlng.lat,
                lng: event.latlng.lng,
            };

            if (markerRef.current) {
                markerRef.current.setLatLng(event.latlng);
            } else {
                markerRef.current = createMarker(map, location, updateLocation);
            }

            updateLocation(location);
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
            markerRef.current = createMarker(map, value, updateLocation);
            map.setView([value.lat, value.lng], 15);

            return;
        }

        const current = marker.getLatLng();

        if (current.lat !== value.lat || current.lng !== value.lng) {
            marker.setLatLng([value.lat, value.lng]);
            map.setView([value.lat, value.lng], 15);
        }
    }, [value]);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    className="min-h-10"
                    onClick={requestCurrentLocation}
                    disabled={isLocating}
                >
                    {isLocating ? (
                        <LoaderCircle className="me-2 size-4 animate-spin" aria-hidden="true" />
                    ) : (
                        <MapPin className="me-2 size-4" aria-hidden="true" />
                    )}

                    {isLocating
                        ? t('contact.form.location.locating')
                        : t('contact.form.location.useCurrentLocation')}
                </Button>
            </div>

            {locationError && (
                <p role="alert" className="text-destructive text-xs leading-5">
                    {locationError}
                </p>
            )}

            <div ref={containerRef} aria-label={label} className="h-64 w-full" />
        </div>
    );
}
