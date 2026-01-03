import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, FlatList } from 'react-native';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, STYLES } from '../../constants/theme';
import { getPlacePredictions, getPlaceDetails, reverseGeocodeGoogle } from '../../services/GoogleMapsService';

// ... (leaflet icons & subcomponents)

export default function LocationPickerModal({ visible, onClose, onSelectLocation }) {
  // ... (state)

  // ... (useEffect for navigator.geolocation)

  // ... (handleSearchChange)

  const handleSelectPrediction = async (placeId, description) => {
    setSearchText(description);
    setShowPredictions(false);
    const details = await getPlaceDetails(placeId);
    if (details) {
      const newPos = { lat: details.latitude, lng: details.longitude };
      setPosition(newPos);
    }
  };

  const handleConfirm = async () => {
    if (position) {
      // Reverse Geocode the pinned position
      let finalAddress = searchText;
      // If we differ from search?
      // Just fetch fresh for accuracy
      const fetched = await reverseGeocodeGoogle(position.lat, position.lng);
      if (fetched && fetched.address) finalAddress = fetched.address;

      onSelectLocation({
        latitude: position.lat,
        longitude: position.lng,
        address: finalAddress || "Pinned Location"
      });
      onClose();
    }
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose} transparent>
      <View style={{ flex: 1, backgroundColor: 'white', maxWidth: 600, width: '100%', alignSelf: 'center' }}>

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.headerTitle}>Click Map or Search</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search address..."
              value={searchText}
              onChangeText={handleSearchChange}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchText(''); setPredictions([]); setShowPredictions(false) }}>
                <Ionicons name="close-circle" size={18} color="#ccc" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Predictions Overlay */}
        {showPredictions && predictions.length > 0 && (
          <View style={styles.predictionsContainer}>
            {predictions.map(item => (
              <TouchableOpacity
                key={item.place_id}
                style={styles.predictionItem}
                onPress={() => handleSelectPrediction(item.place_id, item.description)}
              >
                <Ionicons name="location-outline" size={16} color="#666" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 14 }}>{item.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {loading || !position ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 10 }}>Locating you...</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <View style={{ height: '100%', width: '100%' }}>
              <MapContainer
                center={[position.lat, position.lng]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <DraggableMarker position={position} setPosition={setPosition} />
                <MapFlyTo position={position} />
              </MapContainer>
            </View>
            <View style={styles.footer}>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmText}>CONFIRM LOCATION</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    backgroundColor: 'white',
    ...STYLES.shadowSmall,
    zIndex: 1000
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  searchInput: { flex: 1, marginLeft: 10, outlineStyle: 'none', fontSize: 16 },

  predictionsContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    ...STYLES.shadow,
    zIndex: 2000,
    maxHeight: 200,
    overflow: 'hidden' // for scrolling if needed, but map helps
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    cursor: 'pointer' // web specific
  },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  footer: { position: 'absolute', bottom: 30, left: 20, right: 20, zIndex: 1000 },
  confirmButton: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 12, alignItems: 'center', ...STYLES.shadow },
  confirmText: { color: 'white', fontWeight: 'bold' }
});