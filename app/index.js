import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../src/constants/theme';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');

      if (hasOnboarded === 'true') {
        // Only skip if the user explicitly checked the box previously
        router.replace('/(auth)');
      } else {
        // Default: Show the "Demo Intro" slides
        router.replace('/onboarding');
      }
    } catch (e) {
      router.replace('/onboarding');
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary }}>
      <ActivityIndicator size="large" color="white" />
    </View>
  );
}