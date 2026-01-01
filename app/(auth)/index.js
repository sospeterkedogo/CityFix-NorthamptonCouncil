import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../src/constants/theme';

export default function Index() {
    const router = useRouter();

    useEffect(() => {
        checkOnboarding();
    }, []);

    const checkOnboarding = async () => {
        try {
            const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');

            // LOGIC:
            // If 'hasOnboarded' is true, the user previously clicked "Don't show again".
            // We skip slides and go straight to the Persona/Login screen.
            if (hasOnboarded === 'true') {
                router.replace('/(auth)/login');
            } else {
                // Default: Show the Onboarding Slides (which serve as your Welcome Screen)
                router.replace('/onboarding');
            }
        } catch (e) {
            // Safety net: If storage fails, show onboarding
            router.replace('/onboarding');
        }
    };

    // While checking, just show a spinner. 
    // The user will only see this for a fraction of a second.
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary }}>
            <ActivityIndicator size="large" color="white" />
        </View>
    );
}