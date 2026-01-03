import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, TextInput, Alert, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, STYLES } from '../../src/constants/theme';
import { db } from '../../src/config/firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

import { getPlacePredictions, getPlaceDetails } from '../../src/services/GoogleMapsService';

// GOOGLE_API_KEY removed; Service handles it via app.json
// const GOOGLE_API_KEY = "YOUR_GOOGLE_API_KEY";

export default function SavedLocations() {
    const router = useRouter();
    const { user } = useAuth();

    // Main List State
    const [locations, setLocations] = useState([]);
    const [filteredLocations, setFilteredLocations] = useState([]);
    const [searchText, setSearchText] = useState('');

    // Main Search Predictions
    const [mainPredictions, setMainPredictions] = useState([]);
    const [showMainPredictions, setShowMainPredictions] = useState(false);
    const mainSearchTimeout = useRef(null);

    // Add Form State
    const [isAdding, setIsAdding] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [newAddress, setNewAddress] = useState('');

    // Autocomplete State (For Add Form)
    const [suggestions, setSuggestions] = useState([]);
    const [searchingAddress, setSearchingAddress] = useState(false);
    const searchTimeout = useRef(null);

    // --- Effects ---

    // 1. Load Locations (Snapshot)
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'users', user.uid, 'saved_locations'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const locs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLocations(locs);
        }, (error) => {
            console.error("Snapshot error:", error);
        });
        return unsubscribe;
    }, [user]);

    // 2. Handle Filtering (Reactive to locations or searchText)
    useEffect(() => {
        // If searchText is empty, show all locations
        if (!searchText) {
            setFilteredLocations(locations);
            return;
        }

        // Otherwise filter
        const query = searchText.toLowerCase();
        const filtered = locations.filter(l =>
            l.label && l.address && (
                l.label.toLowerCase().includes(query) ||
                l.address.toLowerCase().includes(query)
            )
        );
        setFilteredLocations(filtered);
    }, [locations, searchText]);

    // 3. Cleanup timeouts
    useEffect(() => {
        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
            if (mainSearchTimeout.current) clearTimeout(mainSearchTimeout.current);
        };
    }, []);

    // --- Main Search Logic ---
    const handleMainTextChange = (text) => {
        setSearchText(text);

        // 1. Filter Local List
        const query = text.toLowerCase();
        const filtered = locations.filter(l =>
            l.label.toLowerCase().includes(query) ||
            l.address.toLowerCase().includes(query)
        );
        setFilteredLocations(filtered);

        // 2. Fetch Google Predictions
        if (mainSearchTimeout.current) clearTimeout(mainSearchTimeout.current);
        if (text.length < 3) {
            setMainPredictions([]);
            setShowMainPredictions(false);
            return;
        }

        mainSearchTimeout.current = setTimeout(async () => {
            const results = await getPlacePredictions(text);
            setMainPredictions(results);
            setShowMainPredictions(true);
        }, 800);
    };

    const handleSelectMainPrediction = async (item) => {
        // User selected a Google Prediction from the main bar
        // -> Switch to "Add Mode", pre-fill address, and fetch details
        setSearchText(''); // Clear search or keep it? Clear it makes sense as we are moving context.
        setMainPredictions([]);
        setShowMainPredictions(false);
        setFilteredLocations(locations); // Reset filter

        setIsAdding(true);
        setNewAddress(item.description);

        // Get details for the hidden ref
        const details = await getPlaceDetails(item.place_id);
        if (details) {
            selectedPlaceRef.current = {
                lat: details.latitude,
                lng: details.longitude
            };
            // Optional: Auto-suggest label?
        }
    };

    // --- Autocomplete Logic (Google Places) ---
    const handleAddressChange = (text) => {
        setNewAddress(text);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (text.length < 3) {
            setSuggestions([]);
            return;
        }

        setSearchingAddress(true);
        searchTimeout.current = setTimeout(async () => {
            const results = await getPlacePredictions(text);
            setSuggestions(results);
            setSearchingAddress(false);
        }, 800);
    };

    const selectSuggestion = async (item) => {
        if (!item.place_id) return;

        setNewAddress(item.description);
        setSuggestions([]);

        const details = await getPlaceDetails(item.place_id);
        if (details) {
            selectedPlaceRef.current = {
                lat: details.latitude,
                lng: details.longitude
            };
        }
    };

    // Ref to hold coords from selected suggestion
    const selectedPlaceRef = useRef(null);

    const handleAdd = async () => {
        if (!newLabel || !newAddress) {
            Alert.alert("Missing Info", "Please enter a label and address.");
            return;
        }

        let latitude = null;
        let longitude = null;

        // Use coordinates from selection if available
        if (selectedPlaceRef.current) {
            latitude = selectedPlaceRef.current.lat;
            longitude = selectedPlaceRef.current.lng;
        }

        try {
            await addDoc(collection(db, 'users', user.uid, 'saved_locations'), {
                label: newLabel,
                address: newAddress,
                latitude,
                longitude,
                createdAt: Date.now()
            });

            if (Platform.OS === 'web') window.alert("Location saved!");
            else Alert.alert("Success", "Location saved successfully");

            setIsAdding(false);
            setNewLabel('');
            setNewAddress('');
            setSuggestions([]);
            selectedPlaceRef.current = null;

        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Could not save location.");
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'saved_locations', id));
        } catch (e) {
            console.error("Delete error", e);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f2f5' }}>
            <View style={[styles.container, Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Saved Locations</Text>
                    <TouchableOpacity onPress={() => setIsAdding(!isAdding)} style={styles.addBtn}>
                        <Ionicons name={isAdding ? "close" : "add"} size={26} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    {/* List Header: Main Search Bar */}
                    {!isAdding && (
                        <View style={{ zIndex: 100 }}>
                            <View style={styles.searchContainer}>
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search saved or find new..."
                                    value={searchText}
                                    onChangeText={handleMainTextChange}
                                />
                                <Ionicons name="search" size={24} color={COLORS.primary} />
                            </View>

                            {/* Main Predictions Dropdown */}
                            {showMainPredictions && mainPredictions.length > 0 && (
                                <View style={styles.suggestionsBox}>
                                    <View style={{ padding: 8, backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: COLORS.primary }}>
                                            ADD NEW LOCATION
                                        </Text>
                                    </View>
                                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}>
                                        {mainPredictions.map((item, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={styles.suggestionItem}
                                                onPress={() => handleSelectMainPrediction(item)}
                                            >
                                                <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                                                <Text style={styles.suggestionText}>{item.description}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Add New Form */}
                    {isAdding && (
                        <View style={styles.addCard}>
                            <Text style={styles.addTitle}>Add New Place</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Label (e.g. Work, Gym)"
                                value={newLabel} onChangeText={setNewLabel}
                                autoFocus
                            />

                            <View style={{ position: 'relative', zIndex: 10, marginBottom: 10 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <TextInput
                                        style={[styles.input, { marginBottom: 0, flex: 1 }]}
                                        placeholder="Enter Address"
                                        value={newAddress}
                                        onChangeText={handleAddressChange}
                                    />
                                    {searchingAddress && (
                                        <ActivityIndicator
                                            size="small"
                                            color={COLORS.primary}
                                            style={{ marginLeft: 10 }}
                                        />
                                    )}
                                </View>

                                {suggestions.length > 0 && (
                                    <View style={styles.suggestionsBox}>
                                        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 150 }}>
                                            {suggestions.map((item, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={styles.suggestionItem}
                                                    onPress={() => selectSuggestion(item)}
                                                >
                                                    <Ionicons name="location-outline" size={16} color="#666" style={{ marginRight: 8 }} />
                                                    <Text style={styles.suggestionText}>
                                                        {item.description}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
                                <Text style={styles.saveBtnText}>Save Location</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* List */}
                    <FlatList
                        data={filteredLocations}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        keyboardShouldPersistTaps="handled" // Important for scrolling list
                        renderItem={({ item }) => (
                            <View style={styles.locationItem}>
                                <View style={styles.iconBox}>
                                    <Ionicons name="location" size={24} color={COLORS.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemLabel}>{item.label}</Text>
                                    <Text style={styles.itemAddress}>{item.address}</Text>
                                </View>
                                <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ padding: 10 }}>
                                    <Ionicons name="trash-outline" size={20} color="#ccc" />
                                </TouchableOpacity>
                            </View>
                        )}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', marginTop: 50 }}>
                                <Ionicons name="map-outline" size={60} color="#ddd" />
                                <Text style={{ color: '#aaa', marginTop: 10 }}>
                                    {searchText ? "No matches found." : "No saved locations yet."}
                                </Text>
                            </View>
                        }
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#f0f2f5'
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    content: { flex: 1, paddingHorizontal: 20 },

    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginBottom: 20,
        ...STYLES.shadowSmall
    },
    searchInput: { flex: 1, marginRight: 10, fontSize: 16 },

    addCard: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 16,
        marginBottom: 20,
        ...STYLES.shadow,
        zIndex: 100
    },
    addTitle: { fontWeight: 'bold', marginBottom: 15, fontSize: 16 },
    input: {
        backgroundColor: '#f9f9f9',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eee',
        marginBottom: 10,
        fontSize: 16
    },
    suggestionsBox: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eee',
        ...STYLES.shadowSmall,
        maxHeight: 150,
        zIndex: 10,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5'
    },
    suggestionText: {
        fontSize: 14,
        color: '#333'
    },
    saveBtn: {
        backgroundColor: COLORS.primary,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 5,
        zIndex: 1
    },
    saveBtnText: { color: 'white', fontWeight: 'bold' },

    locationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        ...STYLES.shadowSmall
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f7ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    itemLabel: { fontWeight: 'bold', fontSize: 16, color: '#333' },
    itemAddress: { color: '#666', fontSize: 13, marginTop: 2 }
});
