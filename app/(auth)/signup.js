import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, STYLES } from '../../src/constants/theme';

export default function SignupScreen() {
    const router = useRouter();
    const { registerCitizen } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        if (!name || !email || !password) {
            return Alert.alert("Missing Info", "Please fill in all fields.");
        }

        setLoading(true);
        try {
            await registerCitizen(email, password, name);
            // The AuthContext will detect the login and auto-redirect to /(citizen)/dashboard
        } catch (e) {
            setLoading(false);
            Alert.alert("Registration Failed", e.message);
        }
    };

    return (
        <View style={[STYLES.container, { justifyContent: 'center' }]}>
            <Text style={styles.header}>Join City Fix</Text>
            <Text style={styles.subHeader}>Help improve your community.</Text>

            <TextInput
                style={styles.input} placeholder="Full Name"
                value={name} onChangeText={setName}
            />
            <TextInput
                style={styles.input} placeholder="Email Address"
                autoCapitalize="none" keyboardType="email-address"
                value={email} onChangeText={setEmail}
            />
            <TextInput
                style={styles.input} placeholder="Password"
                secureTextEntry value={password} onChangeText={setPassword}
            />

            <TouchableOpacity style={styles.btn} onPress={handleSignup} disabled={loading}>
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Create Account</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                <Text style={{ textAlign: 'center', color: COLORS.text.secondary }}>
                    Already have an account? <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Log In</Text>
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    header: { fontSize: 30, fontWeight: 'bold', color: COLORS.primary, textAlign: 'center' },
    subHeader: { fontSize: 16, color: COLORS.text.secondary, textAlign: 'center', marginBottom: 30 },
    input: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
    btn: { backgroundColor: COLORS.action, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});