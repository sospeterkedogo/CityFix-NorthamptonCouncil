// src/components/LocationPickerModal.web.js
import React, { useState, useEffect } from 'react';
import { 
  View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator 
} from 'react-native';
import * as Location from 'expo-location';
import { COLORS, SPACING, STYLES } from '../constants/theme';

export default function LocationPickerModal({ visible, onClose, onSelectLocation }) {
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState(null);

  useEffect(() => {
    if (visible) {
      (async () => {
        // We still ask for permission on web to simulate the experience
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLoading(false);
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        setLoading(false);
      })();
    }
  }, [visible]);

  const handleConfirm = () => {
    if (region) {
      onSelectLocation(region);
      onClose();
    }
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Location</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.webFallback}>
            <Text style={styles.webText}>📍 Web Simulation Mode</Text>
            <Text style={styles.webSubText}>
              Maps are disabled in the browser to prevent crashes.
            </Text>
            
            {loading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
              <View style={styles.coordsBox}>
                <Text style={styles.coordsLabel}>Your detected location:</Text>
                <Text style={styles.coordsValue}>
                  {region ? `${region.latitude.toFixed(4)}, ${region.longitude.toFixed(4)}` : 'Unknown'}
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmText}>CONFIRM THIS LOCATION</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  closeText: { color: COLORS.action, fontWeight: '600' },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  webFallback: {
    backgroundColor: '#F8F9FA',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  webText: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary, marginBottom: 10 },
  webSubText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  coordsBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    width: '100%',
  },
  coordsLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  coordsValue: { fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace', color: COLORS.action },
  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: 'bold' }
});