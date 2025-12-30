import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Platform, Image } from 'react-native';
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
    const [isDemoMode, setIsDemoMode] = useState(false); // Can be removed if not used elsewhere, but variable name was used in code. Assuming unused now.
    // Actually, remove the whole block.

    const handleLogin = async () => {
        if (!email || !password) return Alert.alert("Error", "Please fill in all fields");
        setLoading(true);
        try {
            await login(email, password);
        } catch (e) {
            Alert.alert("Login Failed", e.message);
            setLoading(false);
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
                        <Text style={styles.welcomeText}>Welcome Back</Text>
                        <Text style={styles.subText}>Sign in to continue to City Fix</Text>
                    </View>

                    {/* Form Section */}
                    <View style={styles.formContainer}>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Email Address</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="name@example.com"
                                placeholderTextColor="#94a3b8"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your password"
                                placeholderTextColor="#94a3b8"
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                            />
                        </View>

                        <TouchableOpacity style={styles.forgotBtn}>
                            <Text style={styles.forgotText}>Forgot password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.loginBtnText}>Log In</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Divider */}
                    <View style={styles.dividerContainer}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    < TouchableOpacity style={styles.signupLink} onPress={() => router.push('/(auth)/signup')}>
                        <Text style={styles.signupText}>
                            Don't have an account? <Text style={styles.signupBold}>Sign Up</Text>
                        </Text>
                    </TouchableOpacity>

                    {/* Developer / Demo Section */}
                    <View style={styles.devSection}>
                        <TouchableOpacity onPress={() => router.push('/(auth)/dev-seed')}>
                            <Text style={styles.devLink}>[Dev Seed]</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC', // Very light blue-grey
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
        paddingTop: 60, // Push card down nicely
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 30,
        width: '100%',
        maxWidth: 450,
        alignSelf: 'center',
        // Modern soft shadow
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
        marginBottom: 40,
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: 20,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 8,
    },
    subText: {
        fontSize: 15,
        color: '#64748B',
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
    forgotBtn: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    forgotText: {
        color: COLORS.action,
        fontSize: 14,
        fontWeight: '500',
    },
    loginBtn: {
        backgroundColor: COLORS.action,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        shadowColor: COLORS.action,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    loginBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
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
        fontSize: 12,
        fontWeight: '600',
    },
    signupLink: {
        alignItems: 'center',
        marginBottom: 20,
    },
    signupText: {
        color: '#64748B',
        fontSize: 15,
    },
    signupBold: {
        color: COLORS.action,
        fontWeight: '700',
    },
    // Demo Section
    demoSection: {
        // Keeping empty or basic style if needed, but renamed to devSection in usage above
        marginTop: 10,
        alignItems: 'center',
    },
    devSection: {
        marginTop: 10,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 20,
        width: '100%',
    },
    devLink: {
        fontSize: 10,
        color: '#CBD5E1',
        marginTop: 5,
    }
});