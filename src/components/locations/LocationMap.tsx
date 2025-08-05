'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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
  shadowSize: [41, 41]
});

// Set the default icon for all markers
L.Marker.prototype.options.icon = DefaultIcon;

export type LocationMapProps = {
  latitude: number;
  longitude: number;
  zoom?: number;
  height?: string | number;
  width?: string | number;
  interactive?: boolean;
  popupContent?: React.ReactNode;
};

export default function LocationMap({
  latitude,
  longitude,
  zoom = 13,
  height = 400,
  width = '100%',
  interactive = true,
  popupContent
}: LocationMapProps) {
  return (
    <Box sx={{ height, width, position: 'relative' }}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={interactive}
        dragging={interactive}
        touchZoom={interactive}
        doubleClickZoom={interactive}
        zoomControl={interactive}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]}>
          {popupContent && <Popup>{popupContent}</Popup>}
        </Marker>
      </MapContainer>
    </Box>
  );
}