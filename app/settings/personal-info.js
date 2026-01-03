import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Image, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, STYLES } from '../../src/constants/theme';
import { UserService } from '../../src/services/userService';
import { updateProfile } from 'firebase/auth';
import { getPlacePredictions, getPlaceDetails } from '../../src/services/GoogleMapsService';

export default function PersonalInfo() {
    const router = useRouter();
    const { user, userRole } = useAuth();
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [phone, setPhone] = useState('');
    const [doorNo, setDoorNo] = useState('');
    const [street, setStreet] = useState('');
    const [city, setCity] = useState('');

    // Address Search State
    const [addressSearch, setAddressSearch] = useState('');
    const [addressPredictions, setAddressPredictions] = useState([]);
    const [showAddressPredictions, setShowAddressPredictions] = useState(false);
    const addressSearchTimeout = useRef(null);

    useEffect(() => {
        if (user?.uid) {
            loadProfile();
            // initialize display name only if empty or just loaded
            if (!displayName) setDisplayName(user.displayName || '');
        }
    }, [user?.uid]);

    const loadProfile = async () => {
        try {
            const data = await UserService.getEngineerProfile(user.uid);
            if (data) {
                setPhone(data.phone || '');
                setDoorNo(data.doorNo || '');
                setStreet(data.street || '');
                setCity(data.city || '');
            }
        } catch (e) { console.error(e); }
    };


    // Address Search Logic
    const handleAddressSearch = (text) => {
        setAddressSearch(text);
        if (addressSearchTimeout.current) clearTimeout(addressSearchTimeout.current);

        if (text.length < 3) {
            setAddressPredictions([]);
            setShowAddressPredictions(false);
            return;
        }

        addressSearchTimeout.current = setTimeout(async () => {
            const results = await getPlacePredictions(text);
            setAddressPredictions(results);
            setShowAddressPredictions(true);
        }, 800);
    };

    const fillAddress = async (placeId, description) => {
        setAddressSearch('');
        setAddressPredictions([]);
        setShowAddressPredictions(false);

        const details = await getPlaceDetails(placeId);
        if (details) {
            // console.log("Filling address:", details); removed
            let streetNumber = '';
            let route = '';
            let cityVal = ''; // default fallback

            // Naively parse components or use formatted text
            // Google 'address_components' usually has what we need
            details.components.forEach(c => {
                if (c.types.includes('street_number')) streetNumber = c.long_name;
                if (c.types.includes('route')) route = c.long_name;
                if (c.types.includes('postal_town') || c.types.includes('locality')) cityVal = c.long_name;
            });

            const streetFull = `${streetNumber} ${route}`.trim();

            setDoorNo(streetNumber);
            setStreet(route || streetFull || description.split(',')[0]);
            setCity(cityVal || "Northampton");
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // 1. Auth Update
            if (displayName !== user.displayName) {
                await updateProfile(user, { displayName });
            }

            // 2. Firestore Update
            const fullAddress = `${doorNo} ${street}, ${city}`.trim();
            await UserService.updateUserProfile(user.uid, {
                displayName,
                phone,
                doorNo,
                street,
                city,
                address: fullAddress
            });

            // Reload user to refresh context if needed
            await user.reload();

            Alert.alert("Success", "Personal info updated.");
            setIsEditing(false);
        } catch (e) {
            Alert.alert("Error", "Failed to update profile.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const Field = ({ label, value, icon, editable = true, onChange, placeholder, isMulti = false }) => (
        <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
                <Ionicons name={icon} size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={styles.fieldLabel}>{label}</Text>
            </View>
            {isEditing && editable ? (
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder={placeholder}
                    multiline={isMulti}
                />
            ) : (
                <Text style={styles.fieldValue}>{value || 'Not set'}</Text>
            )}
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f2f5' }}>
            <View style={[styles.container, Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Personal Info</Text>
                    <TouchableOpacity onPress={() => isEditing ? handleSave() : setIsEditing(true)} disabled={loading}>
                        {loading ? <ActivityIndicator size="small" color={COLORS.primary} /> : (
                            <Text style={styles.editBtnText}>{isEditing ? 'Save' : 'Edit'}</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.infoCard}>
                        <Text style={styles.cardTitle}>Basic Info</Text>
                        <Text style={styles.cardSub}>Visible to other citizens (except phone/email).</Text>

                        <View style={styles.divider} />

                        <Field
                            label="Display Name"
                            value={displayName}
                            onChange={setDisplayName}
                            icon="person-outline"
                            placeholder="John Doe"
                            isEditing={isEditing}
                        />

                        <View style={styles.divider} />

                        <Field
                            label="Email"
                            value={user?.email}
                            icon="mail-outline"
                            editable={false} // Email typically needs re-auth flow to change
                            isEditing={isEditing}
                        />

                        <View style={styles.divider} />

                        <Field
                            label="Phone Number"
                            value={phone}
                            onChange={setPhone}
                            icon="call-outline"
                            placeholder="+44 7000 000000"
                            isEditing={isEditing}
                        />
                    </View>

                    <View style={styles.infoCard}>
                        <Text style={styles.cardTitle}>Address Location</Text>
                        <Text style={styles.cardSub}>Used to verify local residency.</Text>

                        {isEditing && (
                            <View style={{ marginBottom: 15, zIndex: 100 }}>
                                <Text style={{ fontSize: 13, color: COLORS.primary, marginBottom: 5, fontWeight: '600' }}>Find Address (Auto-fill)</Text>
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Start typing your address..."
                                    value={addressSearch}
                                    onChangeText={handleAddressSearch}
                                />
                                {showAddressPredictions && addressPredictions.length > 0 && (
                                    <View style={styles.predictionsBox}>
                                        <FlatList
                                            data={addressPredictions}
                                            keyExtractor={item => item.place_id}
                                            keyboardShouldPersistTaps="handled"
                                            renderItem={({ item }) => (
                                                <TouchableOpacity
                                                    style={styles.suggestionItem}
                                                    onPress={() => fillAddress(item.place_id, item.description)}
                                                >
                                                    <Ionicons name="location-outline" size={16} color="#666" style={{ marginRight: 8 }} />
                                                    <Text style={styles.suggestionText}>{item.description}</Text>
                                                </TouchableOpacity>
                                            )}
                                            style={{ maxHeight: 150 }}
                                        />
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={styles.divider} />

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Field
                                    label="Door/Flat"
                                    value={doorNo}
                                    onChange={setDoorNo}
                                    icon="home-outline"
                                    placeholder="10A"
                                    isEditing={isEditing}
                                />
                            </View>
                            <View style={{ flex: 2 }}>
                                <Field
                                    label="Street"
                                    value={street}
                                    onChange={setStreet}
                                    icon="map-outline"
                                    placeholder="High Street"
                                    isEditing={isEditing}
                                />
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <Field
                            label="City/Town"
                            value={city}
                            onChange={setCity}
                            icon="business-outline"
                            placeholder="Northampton"
                            isEditing={isEditing}
                        />
                    </View>

                    <Text style={styles.footerText}>
                        Your information is securely stored. See our Privacy Policy for details.
                    </Text>

                </ScrollView>
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
    editBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16 },

    content: { padding: 20 },

    infoCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        ...STYLES.shadowSmall
    },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#202124', marginBottom: 4 },
    cardSub: { fontSize: 13, color: '#5f6368', marginBottom: 15 },
    divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 15 },

    fieldContainer: { marginVertical: 5 },
    fieldHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: '#5f6368' },
    fieldValue: { fontSize: 16, color: '#202124', paddingLeft: 26 },

    input: {
        fontSize: 16,
        color: '#202124',
        borderBottomWidth: 1,
        borderColor: COLORS.primary,
        paddingVertical: 5,
        marginLeft: 26
    },
    searchInput: {
        backgroundColor: '#f9f9f9',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        fontSize: 15
    },
    predictionsBox: {
        backgroundColor: 'white',
        borderRadius: 8,
        marginTop: 5,
        borderWidth: 1,
        borderColor: '#eee',
        ...STYLES.shadowSmall,
        maxHeight: 150
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5'
    },
    suggestionText: { fontSize: 13, color: '#333' },

    footerText: { textAlign: 'center', color: '#999', fontSize: 12, marginBottom: 30 }
});
