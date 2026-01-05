import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { useNotifications } from '../../src/context/NotificationContext';

import { formatRelativeTime } from '../../src/utils/dateUtils';

export default function NotificationsScreen() {
    const router = useRouter();
    const { notifications, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

    const handleNotificationPress = (item) => {
        markAsRead(item.id);

        // Deep Linking Logic
        if (item.type === 'chat' && item.partnerId) {
            router.push({
                pathname: '/(citizen)/chat/[id]',
                params: {
                    id: item.partnerId,
                    name: item.name || 'Neighbor',
                    lastActive: Date.now() // rough fallback
                }
            });
        }
        else if (item.title?.includes('Accepted') || item.body?.includes('accepted')) {
            router.push('/(citizen)/social');
        }
        else if (item.type === 'request') {
            router.push('/(citizen)/social'); // Go to requests tab (default or switch?) 
            // Ideally social page handles tab switching if needed, 
            // but 'social' default is fine or user manually clicks 'Requests'
        }
    };

    const renderItem = ({ item }) => {
        const isUnread = !item.read;
        const date = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt || Date.now());

        return (
            <TouchableOpacity
                style={[styles.card, isUnread ? styles.unreadCard : styles.readCard]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
            >
                {/* Main Content Area */}
                <View style={styles.cardMain}>
                    <View style={[styles.iconContainer, !isUnread && styles.readIconContainer]}>
                        <Ionicons
                            name={item.type === 'alert' ? 'alert' : 'notifications'}
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

                {/* Delete Button */}
                <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deleteNotification(item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="trash-outline" size={18} color="#9aa0a6" />
                </TouchableOpacity>
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
            <View style={[styles.webLayout, Platform.OS === 'web' && { alignSelf: 'center' }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    {notifications.some(n => !n.read) && (
                        <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
                            <Text style={styles.markAllText}>Mark all read</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <FlatList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={80} color="#e0e0e0" />
                            <Text style={styles.emptyText}>All caught up</Text>
                            <Text style={styles.emptySubtext}>You have no new notifications at this time. Enjoy your day!</Text>
                        </View>
                    }
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff', // Cleaner white background like Google apps
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Web Layout Constraint
    webLayout: {
        flex: 1,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fff',
        // Sticky header feel
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#202124', // Google Dark Grey
        letterSpacing: -0.5,
    },
    markAllBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#F1F3F4', // Google light grey pill
    },
    markAllText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
    },
    listContent: {
        paddingVertical: 10,
    },
    // Card Styling
    card: {
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        alignItems: 'center', // Align delete button vertically
        justifyContent: 'space-between'
    },
    cardMain: {
        flexDirection: 'row',
        flex: 1, // Take up remaining space
        alignItems: 'flex-start',
    },
    deleteBtn: {
        padding: 5,
        marginLeft: 10,
    },
    unreadCard: {
        backgroundColor: '#E8F0FE', // Google Light Blue for unread
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
        color: '#5f6368', // Google Grey
    },
    body: {
        fontSize: 14,
        color: '#5f6368',
        lineHeight: 20,
    },
    unreadBody: {
        color: '#3c4043', // Darker grey for unread
    },
    // Dot is redundant with background color, but can keep for clarity if needed
    // Google uses bold text + bg color usually.

    emptyContainer: {
        alignItems: 'center',
        marginTop: 80,
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#202124',
        marginTop: 20,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#5f6368',
        marginTop: 10,
        textAlign: 'center',
        lineHeight: 22,
    },
});
