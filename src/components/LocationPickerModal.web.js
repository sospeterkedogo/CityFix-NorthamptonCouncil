import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import * as Location from 'expo-location';
import { COLORS, SPACING } from '../constants/theme';

// --- LEAFLET IMPORTS (Web Only) ---
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix missing marker icons in Leaflet
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Helper component to handle map clicks
function MapClickHandler({ handleMapClick }) {
  useMapEvents({
    click: (e) => {
      handleMapClick(e.latlng); // Pass latitude/longitude back up
    },
  });
  return null;
}

export default function LocationPickerModal({ visible, onClose, onSelectLocation }) {
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState(null); // { lat, lng }

  useEffect(() => {
    if (visible) {
      (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          // Fallback to Northampton Center if permission denied
          setRegion({ lat: 52.2405, lng: -0.9027 });
          setLoading(false);
          return;
        }

        let loc = await Location.getCurrentPositionAsync({});
        setRegion({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
        setLoading(false);
      })();
    }
  }, [visible]);

  // Handle map click
  const handleMapUpdate = (latlng) => {
    setRegion(latlng);
  };

  // Confirm Selection
  const handleConfirm = () => {
    if (region) {
      onSelectLocation({
        latitude: region.lat,
        longitude: region.lng,
      });
      onClose();
    }
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose} transparent={false}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pin Location</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Map Area */}
        <View style={styles.content}>
          {loading || !region ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : (
            <View style={{ flex: 1, width: '100%', borderRadius: 12, overflow: 'hidden' }}>
              <MapContainer
                center={[region.lat, region.lng]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[region.lat, region.lng]} icon={icon} />
                <MapClickHandler handleMapClick={handleMapUpdate} />
              </MapContainer>

              {/* Overlay Instruction */}
              <View style={styles.overlay}>
                <Text style={styles.overlayText}>Click map to move pin</Text>
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.coordsBox}>
            <Text style={styles.coordsLabel}>Selected Coordinates:</Text>
            <Text style={styles.coordsValue}>
              {region ? `${region.lat.toFixed(5)}, ${region.lng.toFixed(5)}` : '...'}
            </Text>
          </View>

          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmText}>CONFIRM LOCATION</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    padding: SPACING.l,
    paddingTop: 20, // Web doesn't have notch issues usually, but good for mobile web
    borderBottomWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    zIndex: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  closeText: { color: COLORS.action, fontWeight: '600' },
  content: { flex: 1, position: 'relative' },

  overlay: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 8,
    borderRadius: 20,
    zIndex: 1000,
    ...Platform.select({ web: { boxShadow: '0 2px 5px rgba(0,0,0,0.2)' } })
  },
  overlayText: { fontSize: 12, fontWeight: 'bold', color: '#333' },

  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: 'white',
  },
  coordsBox: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  coordsLabel: { color: '#999' },
  coordsValue: { fontWeight: 'bold', fontFamily: 'monospace' },

  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: 'bold' }
});