import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, STYLES } from '../../src/constants/theme';
import { sendPasswordResetEmail, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../src/config/firebase';
import Toast from '../../src/components/Toast';

export default function SecuritySettings() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: '' });

    const handleResetPassword = async () => {
        if (!user?.email) return;
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, user.email);
            setToast({ visible: true, message: `Reset link sent to ${user.email}` });
        } catch (error) {
            setToast({ visible: true, message: "Error: " + error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (Platform.OS === 'web') {
            if (!window.confirm("Are you sure? This action is permanent and cannot be undone.")) return;
        } else {
            // Native alert logic would go here, wrapping the call
        }

        // Simple re-auth hint
        Alert.alert(
            "Delete Account",
            "This action is permanent and cannot be undone. You may need to sign in again to confirm.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete Forever",
                    style: "destructive",
                    onPress: processDelete
                }
            ]
        );
    };

    const processDelete = async () => {
        setLoading(true);
        try {
            await deleteUser(user);
            // AuthContext's onAuthStateChanged will handle the rest (user will become null)
            Alert.alert("Account Deleted", "We're sorry to see you go.");
        } catch (error) {
            console.error("Delete Error", error);
            if (error.code === 'auth/requires-recent-login') {
                Alert.alert("Security Check", "Please log out and log back in, then try deleting your account again.");
            } else {
                Alert.alert("Error", "Could not delete account. " + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const SecurityItem = ({ title, sub, icon, onPress, color = COLORS.primary, danger = false }) => (
        <TouchableOpacity style={styles.itemContainer} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: danger ? '#fee2e2' : color + '15' }]}>
                <Ionicons name={icon} size={22} color={danger ? COLORS.error : color} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, danger && { color: COLORS.error }]}>{title}</Text>
                <Text style={styles.itemSub}>{sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f2f5' }}>
            <View style={[styles.container, Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Security</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>

                    {/* Password Section */}
                    <Text style={styles.sectionTitle}>Sign In & Recovery</Text>
                    <View style={styles.card}>
                        <SecurityItem
                            title="Change Password"
                            sub="Receive an email to reset your password"
                            icon="key-outline"
                            onPress={handleResetPassword}
                        />
                        <View style={styles.divider} />
                        <SecurityItem
                            title="Two-Factor Authentication"
                            sub="Coming Soon"
                            icon="shield-checkmark-outline"
                            color="#999"
                        />
                    </View>

                    {/* Danger Zone */}
                    <Text style={[styles.sectionTitle, { marginTop: 10, color: COLORS.error }]}>Danger Zone</Text>
                    <View style={styles.card}>
                        <SecurityItem
                            title="Delete Account"
                            sub="Permanently delete your account and data"
                            icon="trash-outline"
                            danger={true}
                            onPress={handleDeleteAccount}
                        />
                    </View>

                    {loading && (
                        <View style={styles.loaderOverlay}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                    )}

                </ScrollView>
            </View>
            <Toast
                visible={toast.visible}
                message={toast.message}
                onHide={() => setToast({ ...toast, visible: false })}
            />
        </SafeAreaView >
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
    content: { padding: 20 },

    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 10,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 20,
        ...STYLES.shadowSmall
    },
    itemContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 },
    itemSub: { fontSize: 13, color: '#888' },
    divider: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 60 },

    loaderOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10
    }
});
