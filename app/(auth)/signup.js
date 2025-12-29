import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, Image, ScrollView } from 'react-native';
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
    }
});