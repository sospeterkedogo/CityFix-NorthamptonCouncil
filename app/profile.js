import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { COLORS, STYLES, SPACING } from '../src/constants/theme';

export default function UserProfile() {
    const { user, userRole, logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to log out?")) {
                await logout();
                router.replace('/(auth)/login');
            }
            return;
        }

        Alert.alert("Log Out", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Log Out",
                style: "destructive",
                onPress: async () => {
                    await logout();
                    router.replace('/(auth)/login');
                }
            }
        ]);
    };

    return (
        <View style={STYLES.container}>
            {/* Back Button */}
            <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 18, color: COLORS.action }}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.header}>My Profile</Text>

            <View style={styles.card}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>{user?.email?.charAt(0).toUpperCase()}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Email</Text>
                    <Text style={styles.value}>{user?.email}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Role</Text>
                    <View style={[styles.badge, { backgroundColor: getRoleColor(userRole) }]}>
                        <Text style={styles.badgeText}>{userRole?.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                    <Text style={styles.label}>User ID</Text>
                    <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
                        {user?.uid}
                    </Text>
                </View>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>

            <Text style={styles.version}>City Fix v1.0.0 (Build 204)</Text>
        </View>
    );
}

const getRoleColor = (role) => {
    switch (role) {
        case 'dispatcher': return COLORS.primary;
        case 'engineer': return '#E67E22';
        case 'qa': return '#8E44AD';
        default: return COLORS.action;
    }
};

const styles = StyleSheet.create({
    header: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary, marginBottom: 20 },
    card: { backgroundColor: 'white', borderRadius: 12, padding: 20, ...STYLES.shadow },
    avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 20 },
    avatarText: { fontSize: 30, fontWeight: 'bold', color: '#666' },
    infoRow: { marginBottom: 15 },
    label: { fontSize: 12, color: '#999', marginBottom: 5, textTransform: 'uppercase' },
    value: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary },
    divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 15 },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    badgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    logoutBtn: { marginTop: 40, backgroundColor: '#ffebee', padding: 15, borderRadius: 12, alignItems: 'center' },
    logoutText: { color: COLORS.error, fontWeight: 'bold', fontSize: 16 },
    version: { textAlign: 'center', color: '#ccc', marginTop: 20, fontSize: 12 }
});