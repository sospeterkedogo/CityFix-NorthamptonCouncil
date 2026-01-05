import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { useNotifications } from '../../src/context/NotificationContext';
import { useAuth } from '../../src/context/AuthContext';
import { query, collection, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/config/firebase';

import { formatRelativeTime } from '../../src/utils/dateUtils';

export default function NotificationsScreen() {
    const router = useRouter();
    const { user } = useAuth(); // Need user for call query
    const { notifications, loading: notifLoading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

    const [calls, setCalls] = React.useState([]);
    const [callsLoading, setCallsLoading] = React.useState(true);

    // Fetch Call History
    React.useEffect(() => {
        if (!user) return;

        // Query: Calls where I am caller OR receiver
        // Firestore OR queries are separate, so we combine client-side or listen to both
        // Simpler: Listen to one "unified" logic if possible, but here we'll listen to receiver queries primarily 
        // as user asked for "Missed and Received" (Incoming). 
        // We will add Outgoing for completeness if simple, but focus on Incoming.

        const q = query(
            collection(db, 'calls'),
            where('receiverId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                isCall: true // Flag to distinguish
            }));
            setCalls(list);
            setCallsLoading(false);
        }, (err) => {
            // Index might be missing for composite query, handle graceful fallbacks if needed? 
            // "receiverId" + "createdAt" usually requires index
            console.error(err);
            setCallsLoading(false);
        });

        return () => unsub();
    }, [user]);

    // Merge and Sort
    const feed = React.useMemo(() => {
        // Filter out "Active" call invites from notifications array
        // The user only wants HISTORY (the 'calls' collection), not the alerts
        const historyOnlyNotifs = notifications.filter(n => n.type !== 'call_invite');

        const combined = [...historyOnlyNotifs, ...calls];
        return combined.sort((a, b) => {
            const tA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const tB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return tB - tA; // Descending
        });
    }, [notifications, calls]);

    const handleItemPress = (item) => {
        if (item.isCall) {
            // Navigate to chat with that person
            const otherId = item.callerId === user.uid ? item.receiverId : item.callerId;
            const otherName = item.callerId === user.uid ? 'User' : item.callerName; // Fallback
            router.push({
                pathname: '/(citizen)/chat/[id]',
                params: { id: otherId, name: otherName }
            });
        } else {
            // Standard Notification Handler
            markAsRead(item.id);
            if (item.type === 'chat' && item.partnerId) {
                router.push({ pathname: '/(citizen)/chat/[id]', params: { id: item.partnerId, name: item.name || 'Neighbor' } });
            } else if (item.title?.includes('Accepted') || item.body?.includes('accepted') || item.type === 'request') {
                router.push('/(citizen)/social');
            }
        }
    };

    const getDurationText = (call) => {
        if (!call.startedAt || !call.endedAt) return null;
        const diff = call.endedAt - call.startedAt;
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        return `${mins}m ${secs}s`;
    };

    const renderItem = ({ item }) => {
        // CALL ITEM RENDERER
        if (item.isCall) {
            // Priority Logic:
            // 1. Rejected -> Declined
            // 2. Accepted/Started -> Received
            // 3. Else -> Missed

            let type = 'missed';
            if (item.status === 'rejected') type = 'declined';
            else if (item.status === 'accepted' || (item.status === 'ended' && item.startedAt)) type = 'received';

            const duration = getDurationText(item);

            let iconName = 'call';
            let iconColor = '#5f6368';
            let titleText = `Call from ${item.callerName || 'Unknown'}`;
            let subText = '';

            if (type === 'declined') {
                iconName = 'close-circle';
                iconColor = '#FF4444'; // Red
                subText = 'Declined';
                titleText = `Call from ${item.callerName || 'Unknown'}`;
            } else if (type === 'received') {
                iconName = 'call';
                iconColor = COLORS.success; // Green
                titleText = `Received call from ${item.callerName || 'Unknown'}`;
                subText = duration ? `Duration: ${duration}` : 'Connected';
            } else { // Missed
                iconName = 'warning';
                iconColor = '#FF4444';
                titleText = `Missed call from ${item.callerName || 'Unknown'}`;
                subText = 'Missed';
            }

            return (
                <TouchableOpacity style={styles.card} onPress={() => handleItemPress(item)}>
                    <View style={styles.cardMain}>
                        <View style={[styles.iconContainer, { backgroundColor: '#F1F3F4' }]}>
                            <Ionicons name={iconName} size={20} color={iconColor} />
                        </View>
                        <View style={styles.contentContainer}>
                            <View style={styles.headerRow}>
                                <Text style={[styles.title, { fontWeight: type === 'missed' ? 'bold' : '600' }]}>{titleText}</Text>
                                <Text style={styles.time}>{formatRelativeTime(new Date(item.createdAt))}</Text>
                            </View>
                            <Text style={[styles.body, { color: iconColor, fontWeight: '500' }]}>{subText}</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        }

        // STANDARD NOTIFICATION RENDERER
        const isUnread = !item.read;
        const date = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt || Date.now());

        return (
            <TouchableOpacity
                style={[styles.card, isUnread ? styles.unreadCard : styles.readCard]}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.7}
            >
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

    if (notifLoading || callsLoading) {
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
                    data={feed}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={80} color="#e0e0e0" />
                            <Text style={styles.emptyText}>All caught up</Text>
                            <Text style={styles.emptySubtext}>You have no new notifications at this time.</Text>
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
