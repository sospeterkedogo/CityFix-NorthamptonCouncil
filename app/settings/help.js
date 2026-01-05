import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, TextInput, Alert, LayoutAnimation } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../src/config/firebase';

import Toast from '../../src/components/Toast';

const FORMSPREE_URL = 'https://formspree.io/f/mwvpaaqd';

export default function HelpSupport() {
    const router = useRouter();
    const [expandedFaq, setExpandedFaq] = useState(null);

    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: '' });

    const handleSubmit = async () => {
        if (!message.trim()) {
            setToast({ visible: true, message: "Please enter your concern." });
            return;
        }

        setLoading(true);
        try {
            // 1. Save to Firestore (Permanent Record)
            await addDoc(collection(db, 'feedback'), {
                userId: user.uid,
                userEmail: user.email,
                subject: 'General Support',
                message,
                createdAt: serverTimestamp(),
                status: 'new'
            });

            // 2. Send Email via Formspree (Notification)
            const response = await fetch(FORMSPREE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    subject: 'City Fix Feedback: General Support',
                    message: message,
                    userId: user.uid
                })
            });

            if (response.ok) {
                setToast({ visible: true, message: "Feedback sent successfully!" });
                setMessage('');
            } else {
                throw new Error("Email service failed");
            }

        } catch (error) {
            console.error(error);
            setToast({ visible: true, message: "Failed to send. Please try again." });
        } finally {
            setLoading(false);
        }
    };

    const toggleFaq = (index) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedFaq(expandedFaq === index ? null : index);
    };

    const FAQS = [
        { q: "How do I report a pothole?", a: "Go to the 'New Report' tab, select 'Pothole' from the categories, take a photo, add a description, and submit." },
        { q: "Can I track my report?", a: "Yes, you can view the status of all your submitted reports in the 'My Reports' tab." },
        { q: "How long does it take to fix issues?", a: "Response times vary based on severity. Critical issues are prioritized. You can check the estimated resolution time in the report details." },
        { q: "Is my personal data safe?", a: "Yes, we prioritize data privacy. Please refer to our Privacy Policy for more details details." }
    ];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            <View style={[styles.container, Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Help & Support</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    {/* FAQ Section */}
                    <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
                    <View style={styles.card}>
                        {FAQS.map((item, index) => (
                            <View key={index} style={styles.faqItem}>
                                <TouchableOpacity style={styles.faqHeader} onPress={() => toggleFaq(index)}>
                                    <Text style={styles.question}>{item.q}</Text>
                                    <Ionicons
                                        name={expandedFaq === index ? "chevron-up" : "chevron-down"}
                                        size={20}
                                        color="#999"
                                    />
                                </TouchableOpacity>
                                {expandedFaq === index && (
                                    <View style={styles.answerBox}>
                                        <Text style={styles.answer}>{item.a}</Text>
                                    </View>
                                )}
                                {index < FAQS.length - 1 && <View style={styles.divider} />}
                            </View>
                        ))}
                    </View>

                    {/* Contact Form */}
                    <Text style={styles.sectionTitle}>Contact Us / Report a Concern</Text>
                    <View style={styles.card}>
                        <Text style={styles.label}>How can we help you?</Text>

                        <TextInput
                            style={styles.textArea}
                            multiline
                            numberOfLines={5}
                            placeholder="Describe your issue or feedback here..."
                            placeholderTextColor="#999"
                            value={message}
                            onChangeText={setMessage}
                            textAlignVertical="top"
                        />
                        <TouchableOpacity
                            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            <Text style={styles.submitText}>{loading ? "Sending..." : "Submit Concern"}</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.footerText}>
                        For urgent emergencies, please contact the council directly at 01234 567890.
                    </Text>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
            <Toast
                visible={toast.visible}
                message={toast.message}
                onHide={() => setToast({ ...toast, visible: false })}
            />
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
        backgroundColor: '#f8f9fa'
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    content: { padding: 20 },

    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#888', marginBottom: 10, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 15,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
        marginBottom: 20
    },

    faqItem: { marginBottom: 0 },
    faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    question: { fontSize: 16, fontWeight: '500', color: '#333', flex: 1, marginRight: 10 },
    answerBox: { paddingBottom: 15, paddingRight: 10 },
    answer: { fontSize: 14, color: '#666', lineHeight: 22 },
    divider: { height: 1, backgroundColor: '#f0f0f0' },

    label: { fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 10 },
    textArea: {
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        padding: 15,
        fontSize: 16,
        color: '#333',
        minHeight: 120,
        marginBottom: 15
    },
    submitBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    footerText: { textAlign: 'center', color: '#999', fontSize: 12, marginTop: 10, paddingHorizontal: 20, lineHeight: 18 }
});
