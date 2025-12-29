import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { useNotifications } from '../../src/context/NotificationContext';

// Simple time-ago formatter to avoid heavy dependencies
const formatTimeAgo = (date) => {
    if (!date) return 'Just now';
    const seconds = Math.floor((new Date() - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";

    return "Just now";
};

export default function NotificationsScreen() {
    const router = useRouter();
    const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();

    const renderItem = ({ item }) => {
        const isUnread = !item.read;
        const date = item.createdAt ? item.createdAt.toDate() : new Date();

        return (
            <TouchableOpacity
                style={[
                    styles.card,
                    isUnread ? styles.unreadCard : styles.readCard
                ]}
                onPress={() => markAsRead(item.id)}
            >
                <View style={[styles.iconContainer, isUnread && styles.unreadIcon]}>
                    <Ionicons
                        name={item.type === 'alert' ? 'alert-circle' : 'notifications'}
                        size={24}
                        color={isUnread ? 'white' : COLORS.textSecondary}
                    />
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.title, isUnread && styles.unreadTitle]}>
                            {item.title}
                        </Text>
                        <Text style={styles.time}>
                            {formatTimeAgo(date)}
                        </Text>
                    </View>
                    <Text style={[styles.body, isUnread && styles.unreadBody]}>
                        {item.body}
                    </Text>
                </View>

                {isUnread && <View style={styles.dot} />}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Notifications</Text>
                {notifications.some(n => !n.read) && (
                    <TouchableOpacity onPress={markAllAsRead}>
                        <Text style={styles.markAll}>Mark all as read</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={notifications}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>No notifications yet</Text>
                        <Text style={styles.emptySubtext}>We'll let you know when there are updates.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC', // Light blue-grey background
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        fontFamily: 'Inter-Bold',
    },
    markAll: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
    },
    card: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    readCard: {
        backgroundColor: 'white',
        opacity: 0.8,
    },
    unreadCard: {
        backgroundColor: 'white',
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
        shadowOpacity: 0.1,
        elevation: 4,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    unreadIcon: {
        backgroundColor: COLORS.primary,
    },
    contentContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748B',
    },
    unreadTitle: {
        color: '#1E293B',
        fontWeight: 'bold',
    },
    time: {
        fontSize: 12,
        color: '#94A3B8',
    },
    body: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 20,
    },
    unreadBody: {
        color: '#334155',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.error, // Red dot
        marginLeft: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#94A3B8',
        marginTop: 16,
    },
    emptySubtext: {
        color: '#CBD5E1',
        marginTop: 8,
    },
});
