import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { useNotifications } from '../../src/context/NotificationContext';
import { SocialBadgeProvider, useSocialBadge } from '../../src/context/SocialBadgeContext';
import IncomingCallModal from '../../src/components/IncomingCallModal';
import { useAuth } from '../../src/context/AuthContext';
import { db } from '../../src/config/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc } from 'firebase/firestore';

// Custom "+" Button Component
const CustomAddButton = ({ onPress }) => (
    <TouchableOpacity
        onPress={onPress}
        style={styles.addButton}
        activeOpacity={0.9}
    >
        <Ionicons name="add" size={32} color="white" />
    </TouchableOpacity>
);

// Inner component to access context
function CitizenTabs() {
    const router = useRouter();
    const { unreadCount } = useNotifications(); // Notifications badge
    const { socialBadgeCount } = useSocialBadge(); // Social badge

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: true,
                tabBarLabelPosition: 'below-icon',
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    elevation: 0,
                    backgroundColor: 'white',
                    height: 70,
                    borderTopWidth: 1,
                    borderTopColor: '#f0f0f0',
                    paddingBottom: 10,
                    ...(Platform.OS === 'web' ? {
                        marginHorizontal: 'auto',
                        maxWidth: 600,
                        width: '100%',
                        alignSelf: 'center',
                    } : {})
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: '#999',
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                    marginTop: -5,
                }
            }}
        >
            {/* 1. HOME / FEED (Default) */}
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
                    ),
                }}
            />

            {/* 2. MY REPORTS */}
            <Tabs.Screen
                name="my-reports"
                options={{
                    title: 'Reports',
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons name={focused ? "folder-open" : "folder-open-outline"} size={24} color={color} />
                    ),
                }}
            />

            {/* 3. DASHBOARD */}
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons name={focused ? "grid" : "grid-outline"} size={24} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="social"
                options={{
                    title: "Neighbors",
                    tabBarIcon: ({ color }) => <Ionicons name="people" size={28} color={color} />,
                    tabBarBadge: socialBadgeCount > 0 ? socialBadgeCount : null,
                    tabBarBadgeStyle: { backgroundColor: COLORS.error, fontSize: 10, minWidth: 16, height: 16 },
                }}
            />

            {/* 4. NOTIFICATIONS */}
            <Tabs.Screen
                name="notifications"
                options={{
                    title: 'Updates',
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons name={focused ? "notifications" : "notifications-outline"} size={24} color={color} />
                    ),
                    tabBarBadge: unreadCount > 0 ? unreadCount : null,
                    tabBarBadgeStyle: { backgroundColor: COLORS.error, fontSize: 10, minWidth: 16, height: 16 },
                }}
            />

            {/* HIDE ALL OTHER ROUTES STRICTLY */}
            <Tabs.Screen name="report" options={{ href: null }} />
            <Tabs.Screen name="referrals" options={{ href: null }} />
            <Tabs.Screen name="ticket/[id]" options={{ href: null }} />
            <Tabs.Screen name="chat/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="call" options={{ href: null, tabBarStyle: { display: 'none' } }} />

            <Tabs.Screen name="(user)/[uid]" options={{ href: null }} />

        </Tabs>
    );
}

// Wrapper export
export default function CitizenTabsLayout() {
    return (
        <SocialBadgeProvider>
            <CitizenTabs />
            <CallListener />
        </SocialBadgeProvider>
    );
}

// Separate component to handle the listener logic inside the provider/auth context
function CallListener() {
    const router = useRouter();
    const { user } = useAuth();
    const [incomingCall, setIncomingCall] = React.useState(null); // { id, callerName, callType, callId }

    React.useEffect(() => {
        if (!user) return;

        // Listen for "notifications" collection where type == 'call_invite'
        // and read == false.
        // NOTE: In a real app, you might delete the doc after handling.
        const q = query(
            collection(db, 'users', user.uid, 'notifications'),
            where('type', '==', 'call_invite'),
            where('read', '==', false),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const docSnap = snapshot.docs[0];
                const data = docSnap.data();

                // Check if it's recent (e.g. within 60 seconds)
                const isRecent = (Date.now() - data.createdAt) < 60000;

                if (isRecent) {
                    setIncomingCall({
                        id: docSnap.id,
                        ...data
                    });
                }
            }
        });

        return () => unsubscribe();
    }, [user]);

    // Listener for Active Call Status (Remote Cancellation)
    React.useEffect(() => {
        if (!incomingCall) return;

        const unsubCall = onSnapshot(doc(db, 'calls', incomingCall.callId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.status === 'ended' || data.status === 'rejected' || data.status === 'canceled') {
                    setIncomingCall(null);
                }
            }
        });

        return () => unsubCall();
    }, [incomingCall]);

    const handleAccept = async () => {
        if (incomingCall) {
            // Mark as read
            await updateDoc(doc(db, 'users', user.uid, 'notifications', incomingCall.id), { read: true });

            // Update Call Status and Set Start Time
            await updateDoc(doc(db, 'calls', incomingCall.callId), {
                status: 'accepted',
                startedAt: Date.now()
            });

            const { callId, callMode, fromId } = incomingCall;
            setIncomingCall(null);

            // Navigate to Call Page
            router.push({
                pathname: '/(citizen)/call',
                params: { callId, name: 'Caller', type: callMode }
            });
        }
    };

    const handleDecline = async () => {
        if (incomingCall) {
            await updateDoc(doc(db, 'users', user.uid, 'notifications', incomingCall.id), { read: true });
            // Signal Rejection
            await updateDoc(doc(db, 'calls', incomingCall.callId), { status: 'rejected' });
            setIncomingCall(null);
        }
    };

    return (
        <IncomingCallModal
            visible={!!incomingCall}
            callerName={incomingCall?.body?.split(' ')[0] || "Unknown"}
            callType={incomingCall?.callMode || 'voice'}
            onAccept={handleAccept}
            onDecline={handleDecline}
        />
    );
}

const styles = StyleSheet.create({
    addButton: {
        top: -20, // Float it upwards
        justifyContent: 'center',
        alignItems: 'center',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.action, // Bright color (e.g., Orange/Blue)
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5, // Android shadow
    },
});