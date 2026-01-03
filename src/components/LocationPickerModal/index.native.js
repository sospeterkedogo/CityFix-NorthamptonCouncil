import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { COLORS, SPACING, STYLES } from '../../constants/theme';

export default function LocationPickerModal({ visible, onClose, onSelectLocation }) {
    const [region, setRegion] = useState(null);
    const [loading, setLoading] = useState(true);

    // 1. Get User's Current Location on Mount
    useEffect(() => {
        if (visible) {
            (async () => {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission to access location was denied');
                    setLoading(false);
                    return;
                }

                let location = await Location.getCurrentPositionAsync({});
                setRegion({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.005, // High zoom level for accuracy
                    longitudeDelta: 0.005,
                });
                setLoading(false);
            })();
        }
    }, [visible]);

    // 2. Handle Map Dragging
    const handleRegionChange = (newRegion) => {
        setRegion(newRegion);
    };

    // 3. Confirm Selection
    const handleConfirm = () => {
        if (region) {
            onSelectLocation({
                latitude: region.latitude,
                longitude: region.longitude,
            });
            onClose();
        }
    };

    return (
        <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
            <View style={{ flex: 1 }}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Drag map to pin location</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.closeText}>Cancel</Text>
                    </TouchableOpacity>
                </View>

                {loading || !region ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={{ marginTop: 10 }}>Locating you...</Text>
                    </View>
                ) : (
                    <View style={{ flex: 1 }}>
                        {/* The Map */}
                        <MapView
                            style={{ flex: 1 }}
                            initialRegion={region}
                            onRegionChangeComplete={handleRegionChange} // Updates state when drag ends
                            showsUserLocation={true}
                        />

                        {/* The "Center" Pin Overlay */}
                        <View style={styles.pinOverlay} pointerEvents="none">
                            <Ionicons name="location-sharp" size={40} color={COLORS.primary} />
                            {/* Note: In a real app, use an Image or Icon here for better alignment */}
                        </View>

                        {/* Confirm Button */}
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
        padding: SPACING.l,
        paddingTop: 50, // Safe area for top notch
        backgroundColor: COLORS.background,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderColor: '#E0E0E0',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    closeText: {
        color: COLORS.action,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pinOverlay: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 40, // Offset to make the pin point exactly at center
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
    },
    confirmButton: {
        backgroundColor: COLORS.primary,
        padding: SPACING.m,
        borderRadius: 12,
        alignItems: 'center',
        ...STYLES.shadow,
    },
    confirmText: {
        color: COLORS.text.light,
        fontWeight: 'bold',
        fontSize: 16,
    }
});
