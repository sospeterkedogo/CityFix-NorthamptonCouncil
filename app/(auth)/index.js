import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING } from '../../src/constants/theme';

export default function WelcomeScreen() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkOnboarding();
    }, []);

    const checkOnboarding = async () => {
        try {
            const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');

            if (hasOnboarded === 'true') {
                // If they have onboarded, let the AuthContext in _layout.js handle the routing
                // We just redirect to the Auth group, and _layout will redirect to Dashboard if logged in
                router.replace('/(auth)');
            } else {
                // If first time, show onboarding
                router.replace('/onboarding');
            }
        } catch (e) {
            console.error(e);
            router.replace('/(auth)');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.emoji}>🏙️</Text>
                <Text style={styles.title}>City Fix</Text>
                <Text style={styles.subtitle}>
                    Report problems, track fixes, and improve your community with Northampton Council.
                </Text>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => router.push('/(auth)/login')}
                >
                    <Text style={styles.btnText}>Log In</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => router.push('/(auth)/signup')}
                >
                    <Text style={styles.secondaryText}>Create Citizen Account</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.primary },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
    emoji: { fontSize: 80, marginBottom: 20 },
    title: { fontSize: 40, fontWeight: 'bold', color: 'white', marginBottom: 10 },
    subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 16, textAlign: 'center', lineHeight: 24 },
    footer: { padding: 30, width: '100%', gap: 15 },
    primaryBtn: { backgroundColor: COLORS.action, padding: 18, borderRadius: 12, alignItems: 'center' },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    secondaryBtn: { backgroundColor: 'transparent', padding: 18, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'white' },
    secondaryText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});