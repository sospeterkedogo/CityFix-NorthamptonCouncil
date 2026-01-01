import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { NotificationService } from '../../src/services/notificationService';
import { COLORS, SPACING, STYLES } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import TutorialOverlay from '../../src/components/TutorialOverlay';

export default function EngineerNotifications() {
    const { user } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load Notifications on Focus
    useFocusEffect(
        useCallback(() => {
            loadNotifications();
        }, [])
    );

    const loadNotifications = async () => {
        if (!user) return;
        setLoading(true);
        const data = await NotificationService.getNotifications(user.uid);
        setNotifications(data);
        setLoading(false);
    };

    const handlePress = async (item) => {
        // 1. Mark as read immediately in UI
        const updated = notifications.map(n => n.id === item.id ? { ...n, read: true } : n);
        setNotifications(updated);

        // 2. Mark as read in DB
        if (!item.read) {
            await NotificationService.markAsRead(user.uid, item.id);
        }

        // 3. Navigate based on type
        if (item.ticketId) {
            // Navigate to resolve page if assigned, or just dashboard
            // For now, let's go to Dashboard or Resolve if it's a new job
            // If it's "New Job Assigned", maybe go to resolve? 
            // Actually, just go to history or dashboard.
            // Let's go to dashboard as a safe default.
            router.push('/(engineer)/dashboard');
        }
    };

    const markAllRead = async () => {
        const unread = notifications.filter(n => !n.read);
        if (unread.length === 0) return;

        // Optimistic Update
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));

        // Batch Update
        for (const n of unread) {
            await NotificationService.markAsRead(user.uid, n.id);
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.row, !item.read && styles.unreadRow]}
            onPress={() => handlePress(item)}
        >
            <View style={[styles.iconCircle, { backgroundColor: item.read ? '#eee' : '#e3f2fd' }]}>
                <Ionicons
                    name={item.type === 'status_update' ? "checkmark-done-circle" : "information-circle"}
                    size={24}
                    color={item.read ? '#999' : COLORS.primary}
                />
            </View>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={[styles.title, !item.read && styles.unreadTitle]}>{item.title}</Text>
                    <Text style={styles.time}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <Text style={[styles.body, !item.read && styles.unreadBody]}>{item.body}</Text>
            </View>
            {!item.read && <View style={styles.dot} />}
        </TouchableOpacity>
    );

    return (
        <View style={STYLES.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Notifications</Text>
                {notifications.some(n => !n.read) && (
                    <TouchableOpacity onPress={markAllRead}>
                        <Text style={styles.markRead}>Mark all read</Text>
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <ActivityIndicator size="large" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    contentContainerStyle={[
                        styles.listContent,
                        Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' }
                    ]}
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
                            <Text style={styles.emptyText}>No notifications yet.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        padding: 20,
        backgroundColor: 'white',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...STYLES.shadow
    },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
    markRead: { color: COLORS.action, fontWeight: '600' },

    listContent: { padding: 10 },
    row: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
        alignItems: 'center',
        ...STYLES.shadow
    },
    unreadRow: { backgroundColor: '#f0f9ff', borderColor: '#bae6fd', borderWidth: 1 },

    iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },

    title: { fontSize: 16, fontWeight: '600', color: '#333' },
    unreadTitle: { color: COLORS.primary, fontWeight: 'bold' },

    body: { fontSize: 14, color: '#666', marginTop: 2 },
    unreadBody: { color: '#333' },

    time: { fontSize: 12, color: '#999' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.action, marginLeft: 10 },

    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 10, color: '#999', fontSize: 16 }
});
