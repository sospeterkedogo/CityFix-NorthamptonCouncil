import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';

export default function EngineerLayout() {
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
          backgroundColor: 'white',
          height: 70,
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          paddingBottom: 10,
          elevation: 0,
          ...(Platform.OS === 'web' ? {
            marginHorizontal: 'auto',
            maxWidth: 600,
          } : {})
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: -5,
        }
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'My Jobs',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "briefcase" : "briefcase-outline"} size={26} color={color} />
          ),
        }}
      />

      {/* 2. HISTORY */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "time" : "time-outline"} size={26} color={color} />
          ),
        }}
      />

      {/* Hidden Screens */}
      <Tabs.Screen
        name="resolve"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
    </Tabs>
  );
}