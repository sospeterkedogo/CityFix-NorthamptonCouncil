import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, STYLES } from '../../src/constants/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [isDemoMode, setIsDemoMode] = useState(false);

    const handleDemoLogin = async (role) => {
        const credentials = {
            citizen: { email: 'citizen@cityfix.com', pass: 'password123' },
            dispatcher: { email: 'dispatcher@cityfix.com', pass: 'password123' },
            engineer: { email: 'eng@cityfix.com', pass: 'password123' },
            qa: { email: 'qa@cityfix.com', pass: 'password123' },
        };

        const creds = credentials[role];
        if (creds) {
            setEmail(creds.email);
            setPassword(creds.pass);
            // Initiate login with selected credentials
            setLoading(true);
            try {
                await login(creds.email, creds.pass);
            } catch (e) {
                Alert.alert("Demo Failed", "Ensure the seed script has been executed. Details: " + e.message);
                setLoading(false);
            }
        }
    };

    const handleLogin = async () => {
        if (!email || !password) return Alert.alert("Error", "Please fill in all fields");
        setLoading(true);
        try {
            await login(email, password);
            // Navigation is handled automatically by the root layout upon auth state change
        } catch (e) {
            Alert.alert("Login Failed", e.message);
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <Text style={styles.header}>Welcome Back</Text>

            {/* Input Fields */}
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Log In</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.signupLink} onPress={() => router.push('/(auth)/signup')}>
                <Text style={styles.signupText}>Don't have an account? <Text style={styles.signupBold}>Sign Up</Text></Text>
            </TouchableOpacity>

            {/* Demo Mode Toggle */}
            <TouchableOpacity onPress={() => setIsDemoMode(!isDemoMode)} style={{ marginTop: 30, marginBottom: 10 }}>
                <Text style={{ textAlign: 'center', color: COLORS.text.secondary, textDecorationLine: 'underline' }}>
                    {isDemoMode ? "Hide Demo Options" : "Try Demo Mode"}
                </Text>
            </TouchableOpacity>

            {/* Demo Access Controls */}
            {isDemoMode && (
                <View style={styles.demoBox}>
                    <Text style={styles.demoTitle}>Select a Persona:</Text>

                    <TouchableOpacity style={styles.demoBtn} onPress={() => handleDemoLogin('citizen')}>
                        <Ionicons name="person-outline" size={20} color="white" style={styles.iconSpacing} />
                        <Text style={styles.demoText}>Citizen</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.demoBtn} onPress={() => handleDemoLogin('dispatcher')}>
                        <Ionicons name="desktop-outline" size={20} color="white" style={styles.iconSpacing} />
                        <Text style={styles.demoText}>Dispatcher (Admin)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.demoBtn} onPress={() => handleDemoLogin('engineer')}>
                        <Ionicons name="construct-outline" size={20} color="white" style={styles.iconSpacing} />
                        <Text style={styles.demoText}>Field Engineer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.demoBtn} onPress={() => handleDemoLogin('qa')}>
                        <Ionicons name="clipboard-outline" size={20} color="white" style={styles.iconSpacing} />
                        <Text style={styles.demoText}>QA Auditor</Text>
                    </TouchableOpacity>

                    <Text style={styles.demoNote}>*Requires Seed Script to be run once.</Text>
                </View>
            )}

            {/* Developer Tools */}
            <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.push('/(auth)/dev-seed')}>
                <Text style={{ color: '#ccc', fontSize: 10, textAlign: 'center' }}>[Dev Seed]</Text>
            </TouchableOpacity>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    header: { fontSize: 30, fontWeight: 'bold', color: COLORS.primary, marginBottom: 40, textAlign: 'center' },
    input: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
    loginBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
    demoBox: { marginTop: 10, padding: 15, backgroundColor: '#e0e0e0', borderRadius: 8 },
    demoTitle: { fontWeight: 'bold', marginBottom: 10, color: '#555', textAlign: 'center' },
    demoBtn: {
        padding: 12,
        borderRadius: 6,
        marginBottom: 8,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        backgroundColor: COLORS.secondary // Uniform color
    },
    demoText: { color: 'white', fontWeight: 'bold' },
    demoNote: { fontSize: 10, color: '#888', textAlign: 'center', marginTop: 5 },
    iconSpacing: { marginRight: 8 },
    signupLink: { marginTop: 15, alignItems: 'center' },
    signupText: { color: COLORS.text.secondary },
    signupBold: { color: COLORS.primary, fontWeight: 'bold' }
});