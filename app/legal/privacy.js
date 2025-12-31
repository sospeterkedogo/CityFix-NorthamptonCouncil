import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';

export default function PrivacyPolicy() {
    const router = useRouter();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            <View style={[styles.container, Platform.OS === 'web' && { maxWidth: 800, width: '100%', alignSelf: 'center' }]}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Privacy Policy</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={styles.lastUpdated}>Last Updated: December 31, 2024</Text>

                    <Text style={styles.paragraph}>
                        Northampton Council ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how CityFix collects, uses, and discloses your personal information.
                    </Text>

                    <Section title="1. Information We Collect">
                        <Bullet point="Account Data: Name, email address, and profile picture (if provided)." />
                        <Bullet point="Report Data: Location, photos, and descriptions of issues you report." />
                        <Bullet point="Usage Data: App interactions, device type, and operating system." />
                    </Section>

                    <Section title="2. How We Use Your Information">
                        <Bullet point="To manage and resolve reported maintenance issues." />
                        <Bullet point="To communicate updates regarding your reports." />
                        <Bullet point="To improve the CityFix application and council services." />
                    </Section>

                    <Section title="3. Information Sharing">
                        <Text style={styles.paragraph}>
                            We do not sell your personal data. Your report data (including location and photos) may be visible to assigned engineers and dispatchers to facilitate repairs.
                        </Text>
                    </Section>

                    <Section title="4. Data Security">
                        <Text style={styles.paragraph}>
                            We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
                        </Text>
                    </Section>

                    <Section title="5. Your Rights">
                        <Text style={styles.paragraph}>
                            You have the right to access, correct, or delete your personal information. You can update your profile directly within the app or contact support for data deletion requests.
                        </Text>
                    </Section>

                    <Text style={styles.footer}>
                        If you have any questions about this Privacy Policy, please contact us at privacy@example.com.
                    </Text>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const Section = ({ title, children }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {children}
    </View>
);

const Bullet = ({ point }) => (
    <View style={styles.bulletRow}>
        <View style={styles.bulletDot} />
        <Text style={styles.bulletText}>{point}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderColor: '#eee',
        backgroundColor: 'white'
    },
    backBtn: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    content: { padding: 20 },
    lastUpdated: { fontSize: 14, color: '#666', marginBottom: 20, fontStyle: 'italic' },
    paragraph: { fontSize: 16, color: '#444', lineHeight: 24, marginBottom: 15 },
    section: { marginBottom: 25 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginBottom: 10 },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, paddingLeft: 10 },
    bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#666', marginTop: 8, marginRight: 10 },
    bulletText: { fontSize: 16, color: '#444', lineHeight: 24, flex: 1 },
    footer: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 30, borderTopWidth: 1, borderColor: '#eee', paddingTop: 20 }
});
