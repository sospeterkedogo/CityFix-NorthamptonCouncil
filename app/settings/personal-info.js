import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/constants/theme';

export default function PersonalInfo() {
    const router = useRouter();
    const { user, userRole } = useAuth();

    const InfoItem = ({ label, value, icon, isCopyable }) => (
        <TouchableOpacity style={styles.itemContainer} disabled={!isCopyable} onLongPress={() => { }}>
            <View style={styles.iconBox}>
                <Ionicons name={icon} size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value || 'Not set'}</Text>
            </View>
            {isCopyable && <Ionicons name="copy-outline" size={16} color="#ccc" />}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            <View style={[styles.container, Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Personal Information</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.card}>
                        <View style={styles.hero}>
                            {user?.photoURL ? (
                                <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>{(user?.displayName || user?.email)?.charAt(0).toUpperCase()}</Text>
                                </View>
                            )}
                            <Text style={styles.heroName}>{user?.displayName || 'User'}</Text>
                            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(userRole) + '20' }]}>
                                <Text style={[styles.roleText, { color: getRoleColor(userRole) }]}>{userRole?.toUpperCase() || 'CITIZEN'}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <InfoItem label="Display Name" value={user?.displayName} icon="person-outline" />
                        <InfoItem label="Email Address" value={user?.email} icon="mail-outline" />

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.success} />
                            <Text style={{ marginLeft: 10, color: COLORS.success, fontWeight: 'bold' }}>Account Verified</Text>
                        </View>

                    </View>

                    <Text style={styles.footerText}>
                        To update this information, please go back to the main Profile page and use the Edit function.
                    </Text>

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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#f8f9fa'
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    content: { padding: 20 },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
    },
    hero: { alignItems: 'center', marginBottom: 20 },
    avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },
    avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    avatarText: { fontSize: 30, fontWeight: 'bold', color: COLORS.primary },
    heroName: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    roleText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },

    divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 15 },

    itemContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    iconBox: { width: 40, alignItems: 'center' },
    label: { fontSize: 12, color: '#999', marginBottom: 2 },
    value: { fontSize: 16, color: '#333', fontWeight: '500' },

    infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
    footerText: { textAlign: 'center', color: '#999', fontSize: 12, marginTop: 20, paddingHorizontal: 20 }
});
