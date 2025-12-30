import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, STYLES } from '../../src/constants/theme';

export default function SignupScreen() {
    const router = useRouter();
    const { registerCitizen, login } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
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
            setLoading(true);
            try {
                await login(creds.email, creds.pass);
            } catch (e) {
                Alert.alert("Demo Failed", "Ensure the seed script has been executed. Details: " + e.message);
                setLoading(false);
            }
        }
    };

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
        <View style={styles.mainContainer}>
            {/* Background Pattern or Color */}
            <View style={styles.bgHeader} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.card, Platform.OS === 'web' && styles.webCard]}>

                    {/* Header Section */}
                    <View style={styles.headerContainer}>
                        <Image
                            source={require('../../assets/splash.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.header}>Join City Fix</Text>
                        <Text style={styles.subHeader}>Help improve your community today.</Text>
                    </View>

                    {/* Form Section */}
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

                        <TouchableOpacity style={styles.btn} onPress={handleSignup} disabled={loading}>
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Create Account</Text>}
                        </TouchableOpacity>
                    </View>

                    {/* Divider */}
                    <View style={styles.dividerContainer}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>ALREADY HAVE AN ACCOUNT?</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity onPress={() => router.back()} style={styles.loginLink}>
                        <Text style={styles.loginText}>
                            Log in here
                        </Text>
                    </TouchableOpacity>

                    {/* Developer / Demo Section */}
                    <View style={styles.demoSection}>
                        <TouchableOpacity onPress={() => setIsDemoMode(!isDemoMode)} style={styles.demoToggle}>
                            <Text style={styles.demoToogleText}>
                                {isDemoMode ? "Hide Demo Access" : "Try Demo Persona Login"}
                            </Text>
                        </TouchableOpacity>

                        {!isDemoMode && (
                            <Text style={styles.tipText}>
                                💡 Tip: Click above to access featured pages!
                            </Text>
                        )}

                        {isDemoMode && (
                            <View style={styles.demoBox}>
                                <Text style={styles.demoTitle}>One-Click Login:</Text>
                                <View style={styles.demoGrid}>
                                    <TouchableOpacity style={[styles.demoChip, { backgroundColor: '#3498DB' }]} onPress={() => handleDemoLogin('citizen')}>
                                        <Text style={styles.demoChipText}>Citizen</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.demoChip, { backgroundColor: '#E67E22' }]} onPress={() => handleDemoLogin('dispatcher')}>
                                        <Text style={styles.demoChipText}>Dispatcher</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.demoChip, { backgroundColor: '#27AE60' }]} onPress={() => handleDemoLogin('engineer')}>
                                        <Text style={styles.demoChipText}>Engineer</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.demoChip, { backgroundColor: '#8E44AD' }]} onPress={() => handleDemoLogin('qa')}>
                                        <Text style={styles.demoChipText}>QA</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    bgHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 250,
        backgroundColor: COLORS.primary,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
        paddingTop: 60,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 30,
        width: '100%',
        maxWidth: 450,
        alignSelf: 'center',
        shadowColor: "#64748B",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    webCard: {
        maxWidth: 480,
        marginTop: 40,
        marginBottom: 40,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 15
    },
    header: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 8,
        textAlign: 'center'
    },
    subHeader: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center'
    },
    formContainer: {
        width: '100%',
    },
    inputWrapper: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#F1F5F9', // Slate 100
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        fontSize: 16,
        color: '#1E293B',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    btn: {
        backgroundColor: COLORS.action,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: COLORS.action,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 30,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    dividerText: {
        marginHorizontal: 10,
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: '700',
    },
    loginLink: {
        alignItems: 'center',
    },
    loginText: {
        color: COLORS.action,
        fontWeight: '700',
        fontSize: 15
    },
    // Demo Section
    demoSection: {
        marginTop: 30, // Increased spacing
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 20,
        width: '100%',
    },
    demoToggle: {
        paddingVertical: 5,
    },
    demoToogleText: {
        color: '#94a3b8',
        fontSize: 13,
        fontWeight: '600',
    },
    tipText: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 5,
        fontStyle: 'italic',
    },
    demoBox: {
        width: '100%',
        marginTop: 15,
        backgroundColor: '#F8FAFC',
        padding: 15,
        borderRadius: 12,
    },
    demoTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 10,
        textAlign: 'center',
    },
    demoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
    },
    demoChip: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    demoChipText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '700',
    }
});