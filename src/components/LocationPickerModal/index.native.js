import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, FlatList, SafeAreaView } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, STYLES } from '../../constants/theme';
import { getPlacePredictions, getPlaceDetails, reverseGeocodeGoogle } from '../../services/GoogleMapsService';

export default function LocationPickerModal({ visible, onClose, onSelectLocation }) {
    // ... (state)

    // ... (useEffect for existing location)

    // ... (handleSearchChange)

    const handleSelectPrediction = async (placeId, description) => {
        setSearchText(description);
        setShowPredictions(false);
        const details = await getPlaceDetails(placeId);
        if (details) {
            setRegion({
                latitude: details.latitude,
                longitude: details.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            });
        }
    };

    const handleRegionChange = (newRegion) => {
        setRegion(newRegion);
        // Clear search text if user moves map manually, to forcefully re-geocode on confirm
        // Or keep it? If they move it, the text "10 Downing St" is likely wrong now.
        // Let's clear it if the movement is significant?
        // For now, simpler: If they confirm, we check if search text matches current region? 
        // Actually, easiest is: If they search, we rely on that address. 
        // If they drag, we wipe the search text so we know to reverse geocode.
        // But `onRegionChangeComplete` fires on mount and search select too.
        // We can track if it was user initiated? Hard.

        // Strategy: Only reverse geocode on CONFIRM if we don't have a valid "selected" status?
        // Let's just do it on confirm for now to be safe and save API calls.
    };

    // 4. Confirm Selection
    const handleConfirm = async () => {
        if (!region) return;

        setLoading(true);
        try {
            let finalAddress = searchText;

            // If we don't have search text (user dragged pin) OR user dragged away
            // (Naive check: we should probably always reverse geocode if they touched the map, 
            // but let's assume if searchText is empty/generic, we fetch)

            // Allow "Pinned Location" fallback fallback, but try to fetch real address first
            // We'll fetch if it looks like a coordinate setting

            const fetched = await reverseGeocodeGoogle(region.latitude, region.longitude);
            if (fetched && fetched.address) {
                finalAddress = fetched.address;
            }

            onSelectLocation({
                latitude: region.latitude,
                longitude: region.longitude,
                address: finalAddress || "Pinned Location"
            });
            onClose();
        } catch (e) {
            console.error(e);
            onSelectLocation({
                latitude: region.latitude,
                longitude: region.longitude,
                address: searchText || "Pinned Location"
            });
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
            <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>

                {/* Header & Search */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <Text style={styles.headerTitle}>Pin Location</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={COLORS.text.primary} />
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

                {/* Predictions Dropdown (Absolute) */}
                {showPredictions && predictions.length > 0 && (
                    <View style={styles.predictionsContainer}>
                        <FlatList
                            data={predictions}
                            keyExtractor={item => item.place_id}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.predictionItem}
                                    onPress={() => handleSelectPrediction(item.place_id, item.description)}
                                >
                                    <Ionicons name="location-outline" size={16} color="#666" style={{ marginRight: 10 }} />
                                    <Text style={styles.predictionText}>{item.description}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}

                {loading || !region ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={{ marginTop: 10 }}>Locating you...</Text>
                    </View>
                ) : (
                    <View style={{ flex: 1 }}>
                        <MapView
                            style={{ flex: 1 }}
                            region={region}
                            onRegionChangeComplete={handleRegionChange}
                            showsUserLocation={true}
                        />

                        <View style={styles.pinOverlay} pointerEvents="none">
                            <Ionicons name="location-sharp" size={40} color={COLORS.primary} style={{ marginBottom: 40 }} />
                        </View>

                        <View style={styles.footer}>
                            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                                <Text style={styles.confirmText}>CONFIRM LOCATION</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: 'white',
        zIndex: 10,
        ...STYLES.shadowSmall
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },

    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },

    predictionsContainer: {
        position: 'absolute',
        top: 100, // Adjust based on header height
        left: 20,
        right: 20,
        backgroundColor: 'white',
        borderRadius: 8,
        ...STYLES.shadow,
        zIndex: 20,
        maxHeight: 200
    },
    predictionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    predictionText: { color: '#333' },

    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    pinOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },

    footer: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
    },
    confirmButton: {
        backgroundColor: COLORS.primary,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        ...STYLES.shadow
    },
    confirmText: { color: 'white', fontWeight: 'bold' }
});
