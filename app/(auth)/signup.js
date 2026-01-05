import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, STYLES } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import GetAppModal from '../../src/components/GetTheApp';

export default function SignupScreen() {
    const router = useRouter();
    const { registerCitizen, login } = useAuth();

    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [showAppModal, setShowAppModal] = useState(false);

    const handleDemoLogin = async (role) => {
        let demoEmail = '';
        let demoPass = 'password123'; // Default from dev-seed

        switch (role) {
            case 'citizen': demoEmail = 'citizen@cityfix.com'; break;
            case 'dispatcher': demoEmail = 'dispatcher@cityfix.com'; break;
            case 'engineer': demoEmail = 'eng@cityfix.com'; break;
            case 'qa': demoEmail = 'qa@cityfix.com'; break;
            default: return;
        }

        setLoading(true);
        try {
            await login(demoEmail, demoPass);
        } catch (e) {
            setLoading(false);
            console.error("Demo Login Failed:", e);
            Alert.alert(
                "Demo Account Not Found",
                "It looks like the demo accounts haven't been seeded yet.\n\nTap 'Log in' -> '[Dev Seed]' to generate them.",
                [{ text: "OK" }]
            );
        }
    };

    const [usernameAvailable, setUsernameAvailable] = useState(null); // null, true, false
    const [checkingUsername, setCheckingUsername] = useState(false);

    // Debounced check
    React.useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (username.length >= 3) {
                setCheckingUsername(true);
                const { UserService } = require('../../src/services/userService');
                const isUnique = await UserService.isUsernameUnique(username);
                setUsernameAvailable(isUnique);
                setCheckingUsername(false);
            } else {
                setUsernameAvailable(null);
            }
        }, 500); // 500ms debounce
        return () => clearTimeout(timeoutId);
    }, [username]);

    const handleSignup = async () => {
        if (!name || !email || !password || !username) {
            return Alert.alert("Missing Info", "Please fill in all fields.");
        }

        // 1. Validate Username Format
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return Alert.alert("Invalid Username", "Username must be 3-20 characters long and can only contain letters, numbers, and underscores.");
        }

        if (usernameAvailable === false) {
            return Alert.alert("Unavailable", "That username is taken. Please choose another.");
        }

        setLoading(true);
        try {
            await registerCitizen(email, password, name, username, referralCode);
            // Success
            if (Platform.OS === 'web') {
                setShowAppModal(true);
            } else {
                router.replace('/(citizen)/dashboard'); // Or home
            }
        } catch (e) {
            setLoading(false);
            Alert.alert("Registration Failed", e.message);
        }
    };

    // Demo Persona Card Component
    const DemoCard = ({ role, color, icon, label, description }) => (
        <TouchableOpacity
            style={[styles.demoCard, { borderLeftColor: color }]}
            onPress={() => handleDemoLogin(role)}
            activeOpacity={0.7}
        >
            <View style={[styles.iconBox, { backgroundColor: color }]}>
                <Ionicons name={icon} size={24} color="white" />
            </View>
            <View style={styles.demoTextContent}>
                <Text style={styles.demoLabel}>{label}</Text>
                <Text style={styles.demoDesc}>{description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.mainContainer}>
            <View style={styles.bgHeader} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.card, Platform.OS === 'web' && styles.webCard]}>

                    {/* Header */}
                    <View style={styles.headerContainer}>
                        <Image
                            source={require('../../assets/splash.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.header}>Welcome to CityFix</Text>
                        <Text style={styles.subHeader}>Select a persona to start your demo</Text>
                    </View>

                    {/* PRIMARY: Demo Personas */}
                    <View style={styles.demoGrid}>
                        <DemoCard
                            role="citizen"
                            color="#3498DB"
                            icon="person"
                            label="Citizen"
                            description="Report & track issues"
                        />
                        <DemoCard
                            role="dispatcher"
                            color="#E67E22"
                            icon="map"
                            label="Dispatcher"
                            description="Manage city ops"
                        />
                        <DemoCard
                            role="engineer"
                            color="#27AE60"
                            icon="construct"
                            label="Field Engineer"
                            description="Resolve tickets"
                        />
                        <DemoCard
                            role="qa"
                            color="#8E44AD"
                            icon="checkmark-done-circle"
                            label="QA Analyst"
                            description="Verify quality"
                        />
                    </View>

                    {/* DIVIDER */}
                    <View style={styles.dividerContainer}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR CREATE NEW ACCOUNT</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* SECONDARY: Signup Form */}
                    <View style={styles.formContainer}>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Full Name</Text>
                            <TextInput
                                style={styles.input} placeholder="John Doe"
                                placeholderTextColor="#94a3b8"
                                value={name} onChangeText={setName}
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Username</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <TextInput
                                    style={[styles.input, { flex: 1, borderColor: usernameAvailable === false ? '#EF9A9A' : (usernameAvailable === true ? '#A5D6A7' : '#E2E8F0') }]}
                                    placeholder="john_doe_123"
                                    placeholderTextColor="#94a3b8"
                                    value={username} onChangeText={setUsername}
                                    autoCapitalize="none"
                                />
                                {checkingUsername && <ActivityIndicator size="small" color="#94a3b8" style={{ marginLeft: 10 }} />}
                                {!checkingUsername && usernameAvailable === true && <Ionicons name="checkmark-circle" size={24} color="#4CAF50" style={{ marginLeft: 10 }} />}
                                {!checkingUsername && usernameAvailable === false && <Ionicons name="close-circle" size={24} color="#F44336" style={{ marginLeft: 10 }} />}
                            </View>
                            {!checkingUsername && usernameAvailable === false && <Text style={{ color: '#F44336', fontSize: 12, marginTop: 4 }}>Username taken</Text>}
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Email Address</Text>
                            <TextInput
                                style={styles.input} placeholder="name@example.com"
                                placeholderTextColor="#94a3b8"
                                autoCapitalize="none" keyboardType="email-address"
                                value={email} onChangeText={setEmail}
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Password</Text>
                            <TextInput
                                style={styles.input} placeholder="Create a strong password"
                                placeholderTextColor="#94a3b8"
                                secureTextEntry value={password} onChangeText={setPassword}
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Referral Code (Optional)</Text>
                            <TextInput
                                style={styles.input} placeholder="e.g. JOH123"
                                placeholderTextColor="#94a3b8"
                                value={referralCode} onChangeText={setReferralCode}
                                autoCapitalize="characters"
                            />
                        </View>

                        <TouchableOpacity style={styles.btn} onPress={handleSignup} disabled={loading}>
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Create Account</Text>}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={() => router.push('/login')} style={styles.loginLink}>
                        <Text style={styles.loginText}>
                            Already have an account? Log in
                        </Text>
                    </TouchableOpacity>

                </View>
            </ScrollView>
            <GetAppModal
                visible={showAppModal}
                onClose={() => router.replace('/(citizen)/dashboard')}
                userEmail={email}
            />
        </View >
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
    bgHeader: { position: 'absolute', top: 0, left: 0, right: 0, height: 300, backgroundColor: COLORS.primary },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingTop: 40, paddingBottom: 40 },
    card: {
        backgroundColor: 'white', borderRadius: 24, padding: 30, width: '100%', maxWidth: 500, alignSelf: 'center',
        shadowColor: "#64748B", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
    },
    webCard: { maxWidth: 520, marginTop: 20, marginBottom: 20 },

    headerContainer: { alignItems: 'center', marginBottom: 25 },
    logo: { width: 60, height: 60, marginBottom: 10 },
    header: { fontSize: 26, fontWeight: '800', color: '#1E293B', marginBottom: 5, textAlign: 'center' },
    subHeader: { fontSize: 16, color: '#64748B', textAlign: 'center' },

    // Demo Grid
    demoGrid: { width: '100%', gap: 12 },
    demoCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderLeftWidth: 4,
        borderWidth: 1, borderColor: '#F1F5F9'
    },
    iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    demoTextContent: { flex: 1 },
    demoLabel: { fontSize: 16, fontWeight: '700', color: '#334155' },
    demoDesc: { fontSize: 12, color: '#64748B' },

    // Divider
    dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 30 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
    dividerText: { marginHorizontal: 10, color: '#94a3b8', fontSize: 11, fontWeight: '700' },

    // Form
    formContainer: { width: '100%' },
    inputWrapper: { marginBottom: 15 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginLeft: 4 },
    input: {
        backgroundColor: '#F1F5F9', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, fontSize: 15,
        color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0',
    },
    btn: {
        backgroundColor: COLORS.action,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: COLORS.action, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    loginLink: { alignItems: 'center', marginTop: 20 },
    loginText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
});