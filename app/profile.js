import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UserProfile() {
    const { user, userRole, logout } = useAuth();
    const router = useRouter();
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);

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

    // Toggle Notifications (Visual + Logic Mock)
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

                {/* Custom Header w/ Back */}
                <View style={styles.navHeader}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.pageTitle}>Profile</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* HERO PROFILE SECTION */}
                    <View style={styles.heroSection}>
                        <View style={styles.avatarWrapper}>
                            <View style={styles.avatarCircle}>
                                <Text style={styles.avatarText}>{user?.email?.charAt(0).toUpperCase()}</Text>
                            </View>
                            <TouchableOpacity style={styles.editBadge}>
                                <Ionicons name="pencil" size={12} color="white" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.userName}>{user?.email?.split('@')[0]}</Text>
                        <Text style={styles.userEmail}>{user?.email}</Text>

                        {/* Role Badge */}
                        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(userRole) + '20' }]}>
                            <Text style={[styles.roleText, { color: getRoleColor(userRole) }]}>
                                {userRole?.toUpperCase()} ACCOUNT
                            </Text>
                        </View>
                    </View>

                    {/* SETTINGS GROUPS */}

                    {/* Account */}
                    <SectionHeader title="Account" />
                    <View style={styles.sectionCard}>
                        <SettingsItem icon="person-outline" label="Personal Information" />
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

                    {/* Support */}
                    <SectionHeader title="Support" />
                    <View style={styles.sectionCard}>
                        <SettingsItem icon="help-circle-outline" label="Help & Support" />
                        <View style={styles.divider} />
                        <SettingsItem icon="information-circle-outline" label="About CityFix" />
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
    versionText: {
        textAlign: 'center',
        color: '#ccc',
        marginTop: 20,
        fontSize: 12,
    }
});