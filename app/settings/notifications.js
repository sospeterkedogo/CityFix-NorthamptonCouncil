import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, STYLES } from '../../src/constants/theme';
import { UserService } from '../../src/services/userService';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../src/config/firebase';

export default function NotificationSettings() {
    const router = useRouter();
    const { user } = useAuth();

    // Preferences State
    const [reportUpdates, setReportUpdates] = useState(true);
    const [socialInteractions, setSocialInteractions] = useState(true);
    const [announcements, setAnnouncements] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);

    useEffect(() => {
        if (user) loadPreferences();
    }, [user]);

    const loadPreferences = async () => {
        try {
            const docRef = doc(db, 'users', user.uid, 'settings', 'notifications');
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                setReportUpdates(data.reportUpdates ?? true);
                setSocialInteractions(data.socialInteractions ?? true);
                setAnnouncements(data.announcements ?? true);
                setEmailNotifications(data.emailNotifications ?? true);
            }
        } catch (e) {
            console.error("Failed to load settings", e);
        }
    };

    const savePreference = async (key, value) => {
        try {
            const docRef = doc(db, 'users', user.uid, 'settings', 'notifications');
            await setDoc(docRef, { [key]: value }, { merge: true });
        } catch (e) {
            console.error("Save failed", e);
        }
    };

    const handleToggle = (key, value, setter) => {
        setter(value);
        savePreference(key, value);

        // If enabling push generally, ensure permissions
        if (value && key !== 'emailNotifications') {
            const { registerForPushNotificationsAsync } = require('../../src/utils/notifications');
            registerForPushNotificationsAsync();
        }
    };

    const ToggleItem = ({ label, sub, value, onValueChange }) => (
        <View style={styles.itemRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.itemLabel}>{label}</Text>
                {sub && <Text style={styles.itemSub}>{sub}</Text>}
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

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f2f5' }}>
            <View style={[styles.container, Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={styles.sectionHeader}>PUSH NOTIFICATIONS</Text>
                    <View style={styles.card}>
                        <ToggleItem
                            label="Report Status Updates"
                            sub="Get notified when your reports are resolved or commented on."
                            value={reportUpdates}
                            onValueChange={(v) => handleToggle('reportUpdates', v, setReportUpdates)}
                        />
                        <View style={styles.divider} />
                        <ToggleItem
                            label="Social Interactions"
                            sub="Friend requests, likes, and comments from neighbors."
                            value={socialInteractions}
                            onValueChange={(v) => handleToggle('socialInteractions', v, setSocialInteractions)}
                        />
                        <View style={styles.divider} />
                        <ToggleItem
                            label="Announcements"
                            sub="Important news and alerts from the council."
                            value={announcements}
                            onValueChange={(v) => handleToggle('announcements', v, setAnnouncements)}
                        />
                    </View>

                    <Text style={styles.sectionHeader}>EMAIL PREFERENCES</Text>
                    <View style={styles.card}>
                        <ToggleItem
                            label="Email Notifications"
                            sub="Receive digests and major updates via email."
                            value={emailNotifications}
                            onValueChange={(v) => handleToggle('emailNotifications', v, setEmailNotifications)}
                        />
                    </View>

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
    content: { padding: 20 },

    sectionHeader: {
        fontSize: 13, fontWeight: 'bold', color: '#888', marginBottom: 10, marginLeft: 10, marginTop: 10
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 5,
        ...STYLES.shadowSmall
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 15
    },
    itemLabel: { fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 4 },
    itemSub: { fontSize: 13, color: '#999', lineHeight: 18 },
    divider: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 15 }
});
