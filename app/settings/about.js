import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';

export default function AboutCityFix() {
    const router = useRouter();

    const LinkItem = ({ label, target }) => (
        <TouchableOpacity style={styles.linkItem} onPress={() => router.push(target)}>
            <Text style={styles.linkText}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={[styles.container, Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>About</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.hero}>
                        <Image
                            source={require('../../assets/splash2.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                        <Text style={styles.appName}>CityFix</Text>
                        <Text style={styles.version}>Version 1.0.0 (Build 204)</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Northampton Council</Text>
                        <Text style={styles.description}>
                            CityFix is the official maintenance reporting application for Northampton Council.
                            Our mission is to create a safer, cleaner, and more efficient city for all residents.
                        </Text>
                        <Text style={styles.description}>
                            Report potholes, broken streetlights, graffiti, and more directly to our dispatch team.
                        </Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.linksContainer}>
                        <LinkItem label="Privacy Policy" target="/legal/privacy" />
                        <LinkItem label="Terms of Use" target="/legal/terms" />
                        <LinkItem label="Open Source Licenses" target="/legal/terms" />
                    </View>

                    <View style={styles.footer}>
                        <Ionicons name="business" size={24} color="#ccc" style={{ marginBottom: 10 }} />
                        <Text style={styles.copyright}>© 2024 Northampton Council</Text>
                        <Text style={styles.rights}>All rights reserved.</Text>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    content: { padding: 40, alignItems: 'center' },

    hero: { alignItems: 'center', marginBottom: 40 },
    logoImage: {
        width: 120,
        height: 120,
        marginBottom: 20
    },
    appName: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    version: { fontSize: 14, color: '#999' },

    section: { width: '100%', marginBottom: 30 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    description: { fontSize: 15, color: '#666', lineHeight: 24, marginBottom: 10, textAlign: 'left' },

    divider: { width: '100%', height: 1, backgroundColor: '#f0f0f0', marginBottom: 30 },

    linksContainer: { width: '100%', marginBottom: 40 },
    linkItem: { paddingVertical: 15, borderBottomWidth: 1, borderColor: '#f9f9f9' },
    linkText: { fontSize: 16, color: COLORS.primary, fontWeight: '500' },

    footer: { alignItems: 'center', marginTop: 20 },
    copyright: { fontSize: 12, color: '#999', fontWeight: 'bold' },
    rights: { fontSize: 12, color: '#ccc', marginTop: 2 }
});
