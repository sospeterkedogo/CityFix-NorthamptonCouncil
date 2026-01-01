import React, { useState, useEffect } from 'react';
import { updateProfile } from 'firebase/auth';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, ScrollView, Switch, Image, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { MediaService } from '../src/services/mediaService';
import { UserService } from '../src/services/userService';

export default function UserProfile() {
    const { user, userRole, logout } = useAuth();
    const router = useRouter();
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);

    // Profile State
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user?.displayName || '');
    const [photo, setPhoto] = useState(user?.photoURL || null);

    // Structured Address State
    const [doorNo, setDoorNo] = useState('');
    const [street, setStreet] = useState('');
    const [city, setCity] = useState('');

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.displayName || user.email?.split('@')[0]);
            setPhoto(user.photoURL);
            loadProfileData();
        }
    }, [user]);

    const loadProfileData = async () => {
        const data = await UserService.getEngineerProfile(user.uid);
        if (data) {
            setDoorNo(data.doorNo || '');
            setStreet(data.street || '');
            setCity(data.city || '');
        }
    };

    const pickImage = async () => {
        if (!isEditing) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setPhoto(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            let photoURL = photo;

            // Upload if it's a local file (file:// or starting with /)
            if (photo && !photo.startsWith('http')) {
                photoURL = await MediaService.uploadFile(photo, 'profiles');
            }

            // 1. Update Firebase Auth Profile (Immediate UI Update)
            await updateProfile(user, {
                displayName: name,
                photoURL: photoURL
            });

            // 2. Update Firestore Document (Persistence)
            const fullAddress = `${doorNo} ${street}, ${city}`;
            const res = await UserService.updateUserProfile(user.uid, {
                name: name,
                photoURL: photoURL,
                doorNo,
                street,
                city,
                address: fullAddress.trim() // Keep full string for easy fallback
            });

            if (res.success) {
                // Force reload of user to ensure Context catches up if needed
                await user.reload();

                setIsEditing(false);
                Alert.alert("Success", "Profile updated!");
            } else {
                Alert.alert("Error", "Failed to update profile.");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        if (Platform.OS === 'web') {
            const confirm = window.confirm("Are you sure you want to log out?");
            if (confirm) await logout();
        } else {
            Alert.alert(
                "Log Out",
                "Are you sure you want to log out?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Log Out", style: "destructive", onPress: async () => await logout() }
                ]
            );
        }
    };

    // ... (Toggle Notifications logic remains)
    const toggleNotifications = async (value) => {
        setNotificationsEnabled(value);
        if (value) {
            const { registerForPushNotificationsAsync } = require('../src/utils/notifications');
            try {
                await registerForPushNotificationsAsync();
            } catch (e) { console.log(e); }
        }
    };

    const SettingsItem = ({ icon, label, onPress, showChevron = true, color = '#333' }) => (
        <TouchableOpacity style={styles.itemRow} onPress={onPress}>
            <View style={styles.itemLeft}>
                <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={22} color={COLORS.primary} />
                </View>
                <Text style={[styles.itemText, { color }]}>{label}</Text>
            </View>
            {showChevron && <Ionicons name="chevron-forward" size={20} color="#ccc" />}
        </TouchableOpacity>
    );

    const SettingsToggle = ({ icon, label, value, onValueChange }) => (
        <View style={styles.itemRow}>
            <View style={styles.itemLeft}>
                <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={22} color={COLORS.primary} />
                </View>
                <Text style={styles.itemText}>{label}</Text>
            </View>
            <Switch
                trackColor={{ false: "#e0e0e0", true: COLORS.primary }}
                thumbColor={Platform.OS === 'ios' ? '#fff' : value ? '#fff' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
                onValueChange={onValueChange}
                value={value}
            />
        </View>
    );

    const SectionHeader = ({ title }) => (
        <Text style={styles.sectionTitle}>{title}</Text>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            <View style={[styles.container, Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>

                {/* Custom Header w/ Back & Edit */}
                <View style={styles.navHeader}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.pageTitle}>Profile</Text>
                    <TouchableOpacity onPress={() => isEditing ? handleSave() : setIsEditing(true)} disabled={loading}>
                        {loading ? <ActivityIndicator color={COLORS.primary} /> : (
                            <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>
                                {isEditing ? 'Save' : 'Edit'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* HERO PROFILE SECTION */}
                    <View style={styles.heroSection}>
                        <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage} disabled={!isEditing}>
                            <View style={styles.avatarCircle}>
                                {photo ? (
                                    <Image source={{ uri: photo }} style={{ width: 92, height: 92, borderRadius: 46 }} />
                                ) : (
                                    <Text style={styles.avatarText}>{(name || user?.email)?.charAt(0).toUpperCase()}</Text>
                                )}
                            </View>
                            {isEditing && (
                                <View style={styles.editBadge}>
                                    <Ionicons name="camera" size={12} color="white" />
                                </View>
                            )}
                        </TouchableOpacity>

                        {isEditing ? (
                            <TextInput
                                style={styles.nameInput}
                                value={name}
                                onChangeText={setName}
                                placeholder="Display Name"
                                autoFocus
                            />
                        ) : (
                            <Text style={styles.userName}>{name}</Text>
                        )}

                        <Text style={styles.userEmail}>{user?.email}</Text>

                        {/* Role Badge */}
                        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(userRole) + '20' }]}>
                            <Text style={[styles.roleText, { color: getRoleColor(userRole) }]}>
                                {userRole?.toUpperCase()} ACCOUNT
                            </Text>
                        </View>
                    </View>

                    {/* ADDRESS SECTION (Structured) */}
                    <SectionHeader title="Location" />
                    <View style={styles.sectionCard}>
                        {isEditing ? (
                            <View style={{ padding: 15 }}>
                                <View style={styles.inputRow}>
                                    <View style={{ flex: 1, marginRight: 10 }}>
                                        <Text style={styles.inputLabel}>Door/Flat No</Text>
                                        <TextInput
                                            style={styles.addressInput}
                                            value={doorNo}
                                            onChangeText={setDoorNo}
                                            placeholder="12A"
                                        />
                                    </View>
                                    <View style={{ flex: 2 }}>
                                        <Text style={styles.inputLabel}>Street Name</Text>
                                        <TextInput
                                            style={styles.addressInput}
                                            value={street}
                                            onChangeText={setStreet}
                                            placeholder="Main Street"
                                        />
                                    </View>
                                </View>

                                <View style={{ marginTop: 15 }}>
                                    <Text style={styles.inputLabel}>City/Town</Text>
                                    <TextInput
                                        style={styles.addressInput}
                                        value={city}
                                        onChangeText={setCity}
                                        placeholder="Northampton"
                                    />
                                </View>

                                <Text style={styles.helperText}>Used for local updates (e.g., "{city || 'Northampton'}").</Text>
                            </View>
                        ) : (
                            <SettingsItem
                                icon="map-outline"
                                label={(doorNo || street || city) ? `${doorNo} ${street}, ${city}` : "Set your location"}
                                onPress={() => setIsEditing(true)}
                                color={(doorNo || street || city) ? '#333' : '#999'}
                            />
                        )}
                    </View>

                    {/* SETTINGS GROUPS */}

                    {/* Account */}
                    <SectionHeader title="Account" />
                    <View style={styles.sectionCard}>
                        <SettingsItem icon="person-outline" label="Personal Information" onPress={() => router.push('/settings/personal-info')} />
                        <View style={styles.divider} />
                        <SettingsItem icon="lock-closed-outline" label="Security & Password" />
                        <View style={styles.divider} />
                        <SettingsItem icon="location-outline" label="Saved Locations" />
                    </View>

                    {/* Preferences */}
                    <SectionHeader title="Preferences" />
                    <View style={styles.sectionCard}>
                        <SettingsToggle
                            icon="notifications-outline"
                            label="Push Notifications"
                            value={notificationsEnabled}
                            onValueChange={toggleNotifications}
                        />
                        <View style={styles.divider} />
                        <SettingsItem icon="moon-outline" label="Dark Mode (Coming Soon)" showChevron={false} color="#999" />
                        <View style={styles.divider} />
                        <SettingsItem icon="language-outline" label="Language" />
                    </View>

                    {/* Support & Legal */}
                    <SectionHeader title="Support & Legal" />
                    <View style={styles.sectionCard}>
                        <SettingsItem icon="help-circle-outline" label="Help & Support" onPress={() => router.push('/settings/help')} />
                        <View style={styles.divider} />
                        <SettingsItem icon="information-circle-outline" label="About CityFix" onPress={() => router.push('/settings/about')} />
                        <View style={styles.divider} />
                        <SettingsItem icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => router.push('/legal/privacy')} />
                        <View style={styles.divider} />
                        <SettingsItem icon="document-text-outline" label="Terms of Use" onPress={() => router.push('/legal/terms')} />
                    </View>

                    {/* Sign Out */}
                    <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
                        <Text style={styles.signOutText}>Sign Out</Text>
                    </TouchableOpacity>

                    <Text style={styles.versionText}>Version 1.0.0 (Build 204)</Text>
                    <View style={{ height: 40 }} />

                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const getRoleColor = (role) => {
    switch (role) {
        case 'dispatcher': return COLORS.primary;
        case 'engineer': return '#E67E22';
        case 'qa': return '#8E44AD';
        default: return COLORS.primary;
    }
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    navHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#f8f9fa',
    },
    pageTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },

    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

    heroSection: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 10,
    },
    avatarWrapper: { position: 'relative', marginBottom: 15 },
    avatarCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        borderWidth: 4,
        borderColor: '#fff',
    },
    avatarText: { fontSize: 40, fontWeight: 'bold', color: COLORS.primary },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#f8f9fa',
    },
    userName: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    userEmail: { fontSize: 14, color: '#666', marginBottom: 15 },
    roleBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    roleText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },

    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#888',
        marginBottom: 10,
        marginTop: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: 5,
    },
    sectionCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        paddingVertical: 5,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    itemLeft: { flexDirection: 'row', alignItems: 'center' },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.primary + '10', // 10% opacity primary
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    itemText: { fontSize: 16, fontWeight: '500', color: '#333' },
    divider: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 70 },

    signOutBtn: {
        marginTop: 20,
        backgroundColor: '#fee2e2',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    signOutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 },
    nameInput: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
        borderBottomWidth: 1,
        borderColor: COLORS.primary,
        paddingBottom: 2,
        minWidth: 150,
        textAlign: 'center'
    },
    versionText: {
        textAlign: 'center',
        color: '#ccc',
        marginTop: 20,
        fontSize: 12,
    },
    addressInput: {
        fontSize: 16,
        color: '#333',
        borderBottomWidth: 1,
        borderColor: '#ddd',
        paddingVertical: 8,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#888',
        marginBottom: 2
    },
    helperText: {
        fontSize: 12,
        color: '#888',
        marginTop: 10
    }
});