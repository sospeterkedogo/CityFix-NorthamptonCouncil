import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
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
                tabBarShowLabel: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    elevation: 0,
                    backgroundColor: 'white',
                    height: 60,
                    borderTopWidth: 1,
                    borderTopColor: '#f0f0f0',
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: '#999',
            }}
        >
            {/* 1. HOME / FEED (Default) */}
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={26} color={color} />
                    ),
                }}
            />

            {/* 2. DASHBOARD */}
            <Tabs.Screen
                name="dashboard"
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="speedometer-outline" size={26} color={color} />
                    ),
                }}
            />

            {/* 3. THE CENTER "+" BUTTON (Dummy Screen) */}
            <Tabs.Screen
                name="report_dummy"
                options={{
                    // We override the button to look like a floating action button
                    tabBarButton: (props) => (
                        <CustomAddButton onPress={() => router.push('/(citizen)/report')} />
                    ),
                }}
                listeners={() => ({
                    tabPress: (e) => {
                        e.preventDefault(); // Stop it from actually opening a tab
                        router.push('/(citizen)/report'); // Go to report screen instead
                    },
                })}
            />

            {/* 4. MY REPORTS */}
            <Tabs.Screen
                name="my-reports"
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="grid-outline" size={26} color={color} />
                    ),
                }}
            />

            {/* 5. NOTIFICATIONS (New) */}
            <Tabs.Screen
                name="notifications"
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="notifications-outline" size={26} color={color} />
                    ),
                    tabBarBadge: unreadCount > 0 ? unreadCount : null,
                    tabBarBadgeStyle: { backgroundColor: COLORS.error, fontSize: 10, minWidth: 16, height: 16 },
                }}
            />

            {/* Hide the actual Report screen from the tab bar, 
          so it opens as a full page when clicked */}
            <Tabs.Screen
                name="report"
                options={{ href: null, tabBarStyle: { display: 'none' } }}
            />

            {/* Hide Details page from tabs */}
            <Tabs.Screen
                name="ticket/[id]"
                options={{ href: null, tabBarStyle: { display: 'none' } }}
            />
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