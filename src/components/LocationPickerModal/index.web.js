import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, TextInput, FlatList } from 'react-native';
import * as Location from 'expo-location';
import { COLORS, SPACING, STYLES } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

// --- LEAFLET IMPORTS (Web Only) ---
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';


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
  const [address, setAddress] = useState('Locating...');
  const [manualMode, setManualMode] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [nearbyStreets, setNearbyStreets] = useState([]);
  const [loadingStreets, setLoadingStreets] = useState(false);
  const searchTimeout = useRef(null);

  useEffect(() => {
    if (visible) {
      (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setRegion({ lat: 52.2405, lng: -0.9027 });
          setAddress("Northampton (Default)");
          setLoading(false);
          return;
        }

        let loc = await Location.getCurrentPositionAsync({});
        const r = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setRegion(r);
        setLoading(false);
        reverseGeocode(r);
      })();
    }
  }, [visible]);

  // Robust Reverse Geocode (Expo -> Nominatim Fallback)
  const reverseGeocode = async (coords) => {
    setAddress("Fetching address...");
    try {
      // 1. Try Expo Location First
      const result = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng });

      if (result.length > 0 && (result[0].street || result[0].name)) {
        const r = result[0];
        const street = r.street || r.name || '';
        const city = r.city || r.region || '';
        setAddress(`${street}, ${city}`.trim().replace(/^,/, ''));
      } else {
        // 2. Fallback to Nominatim Fetch (Web often fails with Expo's internal impl without keys)
        throw new Error("Expo Geocoding returned minimal data");
      }
    } catch (e) {
      // Fallback: Fetch directly from OSM Nominatim
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=18&addressdetails=1`);
        const data = await response.json();
        if (data && data.address) {
          const street = data.address.road || data.address.pedestrian || data.address.suburb || "";
          const city = data.address.city || data.address.town || data.address.county || "";
          if (street) {
            setAddress(`${street}, ${city}`.trim().replace(/^,/, ''));
          } else {
            setAddress(data.display_name.split(',')[0]); // Fallback to display name
          }
        } else {
          setAddress("Unknown Location");
        }
      } catch (fetchError) {
        console.log("Geocoding failed completely", fetchError);
        setAddress("Location Selected");
      }
    }
  };

  // Fetch Nearby Streets (Offsets)
  // We use this to populate the list when user opens manual search
  const fetchNearbyStreets = async (center) => {
    setLoadingStreets(true);
    const offsets = [
      { lat: 0, lng: 0 }, // Center
      { lat: 0.001, lng: 0 }, // North (~100m)
      { lat: -0.001, lng: 0 }, // South
      { lat: 0, lng: 0.001 }, // East
      { lat: 0, lng: -0.001 }, // West
    ];

    try {
      // Parallel Geocoding (using Nominatim direct for reliability on web)
      const promises = offsets.map(o =>
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${center.lat + o.lat}&lon=${center.lng + o.lng}&zoom=18&addressdetails=1`)
          .then(res => res.json())
      );

      const results = await Promise.all(promises);
      const streets = new Set();
      const streetList = [];

      results.forEach(data => {
        if (data && data.address) {
          const s = data.address.road || data.address.pedestrian;
          if (s && !streets.has(s)) {
            streets.add(s);
            streetList.push({
              name: s,
              city: data.address.city || data.address.town,
              lat: parseFloat(data.lat),
              lng: parseFloat(data.lon),
              type: 'nearby'
            });
          }
        }
      });
      setNearbyStreets(streetList);
    } catch (e) { console.log(e); }
    finally { setLoadingStreets(false); }
  };

  const ActivateManualMode = () => {
    setManualMode(true);
    if (region) fetchNearbyStreets(region);
  };

  // Handle map click
  const handleMapUpdate = (latlng) => {
    setRegion(latlng);
    reverseGeocode(latlng);
  };

  // Live Autocomplete Search (Nominatim)
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.length < 3) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&addressdetails=1&limit=5`);
        const data = await response.json();
        setSearchResults(data.map(item => ({
          name: item.address ? (item.address.road || item.display_name.split(',')[0]) : item.display_name,
          full_name: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          type: 'search'
        })));
      } catch (e) {
        console.log("Search error", e);
      }
    }, 500); // 500ms debounce
  };

  const selectManualLocation = (item) => {
    const r = { lat: item.lat, lng: item.lng };
    setRegion(r);
    reverseGeocode(r); // Fetch fresh details for consistency
    setManualMode(false);
  };

  // Confirm Selection
  const handleConfirm = () => {
    if (region) {
      onSelectLocation({
        latitude: region.lat,
        longitude: region.lng,
        address: address
      });
      onClose();
    }
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose} transparent={false}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{manualMode ? "Enter Address" : "Pin Location"}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {manualMode ? (
          // MANUAL MODE UI
          <View style={styles.manualContainer}>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search street name..."
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoFocus
              />
              {loadingStreets && <ActivityIndicator color={COLORS.primary} />}
            </View>

            {/* LIST */}
            <FlatList
              data={searchQuery.length > 0 ? searchResults : nearbyStreets}
              keyExtractor={(item, i) => i.toString()}
              ListHeaderComponent={
                <Text style={styles.listHeader}>
                  {searchQuery.length > 0 ? "SEARCH RESULTS" : "NEARBY STREETS"}
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultItem} onPress={() => selectManualLocation(item)}>
                  <Ionicons name={item.type === 'nearby' ? "navigate-circle" : "location"} size={22} color={COLORS.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultText}>{item.name}</Text>
                    {(item.city || item.full_name) &&
                      <Text style={styles.resultSub} numberOfLines={1}>
                        {item.type === 'search' ? item.full_name : item.city}
                      </Text>
                    }
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ marginTop: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#999' }}>
                    {searchQuery.length > 0
                      ? "No results found."
                      : "No nearby streets found."}
                  </Text>
                </View>
              }
            />

            <TouchableOpacity onPress={() => setManualMode(false)} style={styles.backBtn}>
              <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Back to Map</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // MAP MODE UI
          <View style={styles.content}>
            {loading || !region ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
            ) : (
              <View style={{ flex: 1, width: '100%', position: 'relative' }}>
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
        )}

        {/* Footer (Only in Map Mode) */}
        {!manualMode && (
          <View style={styles.footer}>
            <View style={styles.coordsBox}>
              <Text style={styles.coordsLabel}>Selected Location:</Text>
              <Text style={styles.coordsValue} numberOfLines={1}>
                {address}
              </Text>
            </View>

            <TouchableOpacity style={[styles.confirmButton, styles.manualBtn]} onPress={ActivateManualMode}>
              <Text style={[styles.confirmText, { color: COLORS.primary }]}>TYPE LOCATION MANUALLY</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmText}>CONFIRM LOCATION</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    padding: SPACING.l,
    paddingTop: 20,
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
  coordsBox: { marginBottom: 15 },
  coordsLabel: { color: '#999', fontSize: 12, textTransform: 'uppercase' },
  coordsValue: { fontWeight: 'bold', fontSize: 16, color: '#333' },

  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  manualBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  confirmText: { color: '#fff', fontWeight: 'bold' },

  // Manual View Styles
  manualContainer: { flex: 1, padding: 20 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 20, alignItems: 'center' },
  searchInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    outlineStyle: 'none'
  },
  listHeader: { fontSize: 12, fontWeight: 'bold', color: '#999', marginBottom: 10, letterSpacing: 1 },
  resultItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#f0f0f0', gap: 12 },
  resultText: { fontSize: 16, fontWeight: '500', color: '#333' },
  resultSub: { fontSize: 12, color: '#888' },
  backBtn: { marginTop: 20, alignSelf: 'center', padding: 10 },
});