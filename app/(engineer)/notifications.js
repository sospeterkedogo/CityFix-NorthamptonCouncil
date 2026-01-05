import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { NotificationService } from '../../src/services/notificationService';
import { COLORS, SPACING, STYLES } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import TutorialOverlay from '../../src/components/TutorialOverlay';
import { formatRelativeTime } from '../../src/utils/dateUtils';

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

    const renderItem = ({ item }) => {
        const isUnread = !item.read;
        // Fix for "Invalid Date"
        const date = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt || Date.now());

        return (
            <TouchableOpacity
                style={[styles.card, isUnread ? styles.unreadCard : styles.readCard]}
                onPress={() => handlePress(item)}
                activeOpacity={0.7}
            >
                {/* Main Content Area */}
                <View style={styles.cardMain}>
                    <View style={[styles.iconContainer, !isUnread && styles.readIconContainer]}>
                        <Ionicons
                            name={item.type === 'status_update' ? "checkmark-done-circle" : "information-circle"}
                            size={20}
                            color={isUnread ? 'white' : '#5f6368'}
                        />
                    </View>

                    <View style={styles.contentContainer}>
                        <View style={styles.headerRow}>
                            <Text style={[styles.title, isUnread && styles.unreadTitle]} numberOfLines={1}>
                                {item.title}
                            </Text>
                            <Text style={styles.time}>
                                {formatRelativeTime(date)}
                            </Text>
                        </View>
                        <Text style={[styles.body, isUnread && styles.unreadBody]} numberOfLines={2}>
                            {item.body}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Notifications</Text>
                {notifications.some(n => !n.read) && (
                    <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
                        <Text style={styles.markAllText}>Mark all read</Text>
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <ActivityIndicator size="large" style={{ marginTop: 50 }} color={COLORS.primary} />
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
                        <View style={styles.emptyContainer}>
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
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        padding: 20,
        backgroundColor: 'white',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...STYLES.shadow,
        // Web constraint
        ...(Platform.OS === 'web' ? {
            maxWidth: 600,
            width: '100%',
            alignSelf: 'center',
            marginTop: 20,
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10
        } : {})
    },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#202124' },
    markAllBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#F1F3F4',
    },
    markAllText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },

    listContent: { paddingVertical: 10 },

    // Card Styles aligned with Citizen UI
    card: {
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    cardMain: {
        flexDirection: 'row',
        flex: 1,
        alignItems: 'flex-start',
    },
    unreadCard: {
        backgroundColor: '#E8F0FE',
    },
    readCard: {
        backgroundColor: '#fff',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    readIconContainer: {
        backgroundColor: '#F1F3F4',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
        alignItems: 'center',
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: '#202124',
        flex: 1,
        marginRight: 10,
    },
    unreadTitle: {
        fontWeight: '700',
        color: '#202124',
    },
    time: {
        fontSize: 12,
        color: '#5f6368',
    },
    body: {
        fontSize: 14,
        color: '#5f6368',
        lineHeight: 20,
    },
    unreadBody: {
        color: '#3c4043',
    },

    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 10, color: '#999', fontSize: 16 }
});
