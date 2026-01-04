import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, STYLES } from '../../constants/theme';
import { getPlacePredictions, getPlaceDetails, reverseGeocodeGoogle } from '../../services/GoogleMapsService';

export default function LocationPickerModal({ visible, onClose, onSelectLocation }) {
    const [region, setRegion] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [predictions, setPredictions] = useState([]);
    const [showPredictions, setShowPredictions] = useState(false);
    const [loading, setLoading] = useState(true);

    const mapRef = useRef(null);

    // Default to Northampton if location fails
    const DEFAULT_REGION = {
        latitude: 52.2405,
        longitude: -0.9027,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    };

    useEffect(() => {
        if (visible) {
            (async () => {
                setLoading(true);
                try {
                    // 1. Request Permission
                    let { status } = await Location.requestForegroundPermissionsAsync();
                    if (status !== 'granted') {
                        Alert.alert('Permission Denied', 'Permission to access location was denied. Defaulting to Northampton.');
                        setRegion(DEFAULT_REGION);
                        setLoading(false);
                        return;
                    }

                    // 2. Get Location (with timeout to prevent hang)
                    // We use "LOW" accuracy for speed to prevent freezing, then we can refine if needed? 
                    // Actually, let's try balanced.
                    let location = await Promise.race([
                        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                    ]);

                    setRegion({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                    });

                } catch (error) {
                    console.log("Location Error:", error);
                    // Fallback
                    setRegion(DEFAULT_REGION);
                } finally {
                    setLoading(false);
                }
            })();
        }
    }, [visible]);

    const handleSearchChange = async (text) => {
        setSearchText(text);
        if (text.length > 2) {
            const results = await getPlacePredictions(text);
            setPredictions(results);
            setShowPredictions(true);
        } else {
            setPredictions([]);
            setShowPredictions(false);
        }
    };

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

    const handleRegionChange = (newRegion, details) => {
        setRegion(newRegion);
        // Only clear search text if the user manually dragged the map
        if (details?.isGesture) {
            setSearchText('');
        }
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
                            region={region || DEFAULT_REGION}
                            onRegionChangeComplete={handleRegionChange}
                            showsUserLocation={true}
                        />

                        <View style={[styles.pinOverlay, { pointerEvents: 'none' }]}>
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
