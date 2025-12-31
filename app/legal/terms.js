import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';

export default function TermsOfUse() {
    const router = useRouter();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            <View style={[styles.container, Platform.OS === 'web' && { maxWidth: 800, width: '100%', alignSelf: 'center' }]}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Terms of Use</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={styles.lastUpdated}>Last Updated: December 31, 2024</Text>

                    <Text style={styles.paragraph}>
                        Welcome to CityFix. By accessing or using our mobile application, you agree to be bound by these Terms of Use ("Terms"). If you do not agree to these Terms, please do not use the Service.
                    </Text>

                    <Section title="1. Use of the Service">
                        <Text style={styles.paragraph}>
                            CityFix is provided by Northampton Council for reporting non-emergency maintenance issues. You agree to use the app only for lawful purposes and in a way that does not infringe the rights of others.
                        </Text>
                    </Section>

                    <Section title="2. User Conduct">
                        <Text style={styles.paragraph}>You agree not to:</Text>
                        <Bullet point="Submit false or misleading reports." />
                        <Bullet point="Upload offensive, inappropriate, or illegal content." />
                        <Bullet point="Attempt to gain unauthorized access to the app's systems." />
                        <Text style={styles.paragraph}>
                            We reserve the right to suspend or terminate accounts that violate these guidelines.
                        </Text>
                    </Section>

                    <Section title="3. Content Ownership">
                        <Text style={styles.paragraph}>
                            By submitting photos and descriptions, you grant Northampton Council a non-exclusive, royalty-free license to use, reproduce, and display the content for the purpose of resolving the reported issue.
                        </Text>
                    </Section>

                    <Section title="4. Disclaimer">
                        <Text style={styles.paragraph}>
                            The Service is provided "as is" without warranties of any kind. We do not guarantee that the Service will be uninterrupted or error-free.
                        </Text>
                    </Section>

                    <Section title="5. Limitation of Liability">
                        <Text style={styles.paragraph}>
                            Northampton Council shall not be liable for any indirect, incidental, special, or consequential damages arising out of your use of the Service.
                        </Text>
                    </Section>

                    <Text style={styles.footer}>
                        Please contact support@example.com for any inquiries regarding these Terms.
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
