import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { useNotifications } from '../../src/context/NotificationContext';

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

export default function CitizenTabsLayout() {
    const router = useRouter();
    const { unreadCount } = useNotifications();

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
            <Tabs.Screen name="ticket/[id]" options={{ href: null }} />

            <Tabs.Screen name="(user)/[uid]" options={{ href: null }} />

        </Tabs>
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