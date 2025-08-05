'use client';

import React, { useEffect, useRef } from 'react';
import {
    MapContainer,
    TileLayer,
    Marker,
    useMap,
    useMapEvent,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Box } from '@mui/material';
import L from 'leaflet';

// Fix for Leaflet marker icons in Next.js
// This is needed because Leaflet's default marker icons use relative URLs that don't work in Next.js
const DefaultIcon = L.icon({
    iconUrl: '/images/marker-icon.png',
    shadowUrl: '/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Set the default icon for all markers
L.Marker.prototype.options.icon = DefaultIcon;

// Component to update the map center when props change
function MapUpdater({
    latitude,
    longitude,
}: {
    latitude: number;
    longitude: number;
}) {
    const map = useMap();

    useEffect(() => {
        map.setView([latitude, longitude], map.getZoom());
    }, [latitude, longitude, map]);

    return null;
}

// Component to handle marker drag events
function DraggableMarker({
    latitude,
    longitude,
    onPositionChange,
}: {
    latitude: number;
    longitude: number;
    onPositionChange: (lat: number, lng: number) => void;
}) {
    const markerRef = useRef<L.Marker>(null);

    const eventHandlers = {
        dragend() {
            const marker = markerRef.current;
            if (marker) {
                const position = marker.getLatLng();
                onPositionChange(position.lat, position.lng);
            }
        },
    };

    return (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={[latitude, longitude]}
            ref={markerRef}
        />
    );
}

export type LocationPickerMapProps = {
    latitude: number;
    longitude: number;
    zoom?: number;
    height?: string | number;
    width?: string | number;
    onPositionChange: (lat: number, lng: number) => void;
};

export default function LocationPickerMap({
    latitude,
    longitude,
    zoom = 13,
    height = 400,
    width = '100%',
    onPositionChange,
}: LocationPickerMapProps) {
    // Handle map click to update marker position

    return (
        <Box sx={{ height, width, position: 'relative' }}>
            <MapContainer
                center={[latitude, longitude]}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <DraggableMarker
                    latitude={latitude}
                    longitude={longitude}
                    onPositionChange={onPositionChange}
                />
                <MapUpdater latitude={latitude} longitude={longitude} />
            </MapContainer>
        </Box>
    );
}
