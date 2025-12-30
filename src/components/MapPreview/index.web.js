import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet Icon
const icon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

const DEFAULT_CENTER = { lat: 52.2405, lng: -0.9027 };

export default function MapPreview({ location }) {
    const center = location
        ? { lat: location.latitude, lng: location.longitude }
        : DEFAULT_CENTER;

    return (
        <View style={{ flex: 1, overflow: 'hidden' }} pointerEvents="none">
            {/* Styles for this component's map */}
            <style>
                {`
                    .leaflet-container { height: 100%; width: 100%; background: #f0f0f0; }
                    .leaflet-control-container { display: none; } /* Hide all controls */
                `}
            </style>
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />

            {/* Force re-render on location change to snap center */}
            <MapContainer
                key={`${center.lat}-${center.lng}`}
                center={center}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                dragging={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                touchZoom={false}
                attributionControl={false}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {location && <Marker position={center} icon={icon} />}
            </MapContainer>
        </View>
    );
}
