import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Share, StyleSheet, ScrollView, Platform, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, STYLES } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { db } from '../../src/config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Toast from '../../src/components/Toast';


export default function ReferralScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: '' });

    useEffect(() => {
        if (user) fetchUserData();
    }, [user]);

    const fetchUserData = async () => {
        try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setUserData(docSnap.data());
            }
        } catch (e) {
            console.error("Failed to load referral data", e);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateCode = async () => {
        if (!userData || generating) return;
        setGenerating(true);
        try {
            // Logic duplicated from AuthContext to handle legacy users
            const cleanName = (userData.name || user.displayName || "USER").replace(/[^a-zA-Z]/g, '').toUpperCase();
            const prefix = (cleanName.length >= 3 ? cleanName.substring(0, 3) : (cleanName + "XXX").substring(0, 3));
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            const newCode = `${prefix}${randomSuffix}`;

            await updateDoc(doc(db, 'users', user.uid), {
                referralCode: newCode,
                balance: userData.balance || 0, // Ensure balance exists
                referralStatus: userData.referralStatus || 'none'
            });

            setUserData(prev => ({ ...prev, referralCode: newCode }));
            setToast({ visible: true, message: "Referral Code Generated!" });
        } catch (e) {
            setToast({ visible: true, message: "Failed to generate code." });
        } finally {
            setGenerating(false);
        }
    };

    if (!user || loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const referralCode = userData?.referralCode;

    const handleShare = async () => {
        if (!referralCode) return;
        const link = `https://cityfix-northampton.web.app/signup?ref=${referralCode}`;
        const message = `Join City Fix and earn £10! Use my code: ${referralCode} or click: ${link}`;

        try {
            if (Platform.OS === 'web') {
                await Clipboard.setStringAsync(message);
                setToast({ visible: true, message: "Link copied to clipboard!" });
            } else {
                await Share.share({ message });
            }
        } catch (error) {
            setToast({ visible: true, message: "Failed to share." });
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.navBar}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 600, alignSelf: 'center' }}>
                    <TouchableOpacity onPress={() => {
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.replace('/(citizen)/dashboard');
                        }
                    }} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.navTitle}>Invite Friends</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.webContainer, Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>

                    {/* HERO CARD */}
                    <View style={[styles.card, STYLES.shadow]}>
                        <View style={styles.cardHeader}>
                            <View>
                                <Text style={styles.cardTitle}>Give £10, Get £10</Text>
                                <Text style={styles.cardSubtitle}>For every neighbor you invite.</Text>
                            </View>
                            <View style={styles.giftIcon}>
                                <Ionicons name="gift" size={32} color="white" />
                            </View>
                        </View>

                        <Text style={styles.desc}>
                            Invite a neighbor to join City Fix. Once they contribute 5 reports or posts, you both get rewarded!
                        </Text>

                        <View style={styles.divider} />

                        <View style={styles.balanceRow}>
                            <Text style={styles.balanceLabel}>Your Credit Balance</Text>
                            <Text style={styles.balanceValue}>£{userData?.balance || 0}</Text>
                        </View>
                    </View>

                    {/* CODE SECTION */}
                    <Text style={styles.sectionHeader}>Your Unique Code</Text>

                    {referralCode ? (
                        <>
                            <TouchableOpacity style={styles.codeContainer} onPress={handleShare} activeOpacity={0.7}>
                                <View style={styles.codeBox}>
                                    <Text style={styles.codeText}>{referralCode}</Text>
                                </View>
                                <View style={styles.shareBtn}>
                                    <Text style={styles.shareBtnText}>SHARE</Text>
                                    <Ionicons name="share-outline" size={18} color="white" style={{ marginLeft: 5 }} />
                                </View>
                            </TouchableOpacity>
                            <Text style={styles.helperText}>Tap to copy or share</Text>
                        </>
                    ) : (
                        <TouchableOpacity
                            style={[styles.codeContainer, { backgroundColor: '#F0F0F0', borderStyle: 'dashed' }]}
                            onPress={handleGenerateCode}
                            disabled={generating}
                        >
                            <View style={[styles.codeBox, { alignItems: 'center' }]}>
                                {generating ? <ActivityIndicator color={COLORS.primary} /> : <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>TAP TO GENERATE CODE</Text>}
                            </View>
                        </TouchableOpacity>
                    )}


                    {/* HOW IT WORKS */}
                    <Text style={styles.sectionHeader}>How it Works</Text>
                    <View style={styles.stepsContainer}>
                        <StepItem icon="person-add" title="1. Invite" desc="Share your code with neighbors." />
                        <View style={styles.stepLine} />
                        <StepItem icon="chatbubbles" title="2. They Join" desc="They sign up & contribute." />
                        <View style={styles.stepLine} />
                        <StepItem icon="wallet" title="3. Earn" desc="You get £10, they get £10." />
                    </View>

                </View>
            </ScrollView>
            <Toast
                visible={toast.visible}
                message={toast.message}
                onHide={() => setToast({ ...toast, visible: false })}
            />
        </View>
    );
}

const StepItem = ({ icon, title, desc }) => (
    <View style={styles.stepItem}>
        <View style={styles.stepIconBox}>
            <Ionicons name={icon} size={20} color={COLORS.primary} />
        </View>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, paddingTop: Platform.OS === 'ios' ? 10 : 40, backgroundColor: 'white' },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#f0f0f0' },
    navTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text.primary },
    scrollContent: { padding: 20, paddingBottom: 50 },

    // Card
    card: { backgroundColor: COLORS.primary, borderRadius: 24, padding: 25, marginBottom: 30, overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
    cardTitle: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 4 },
    cardSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
    giftIcon: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12 },
    desc: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 22, marginBottom: 20 },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 20 },
    balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    balanceLabel: { color: 'white', fontSize: 16, fontWeight: '500' },
    balanceValue: { color: 'white', fontSize: 32, fontWeight: 'bold' },

    // Code
    sectionHeader: { fontSize: 18, fontWeight: 'bold', color: COLORS.text.primary, marginBottom: 15, marginLeft: 5 },
    codeContainer: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 6,
        borderWidth: 1,
        borderColor: '#eee',
        ...STYLES.shadow
    },
    codeBox: { flex: 1, padding: 15, justifyContent: 'center' },
    codeText: { fontSize: 20, fontWeight: 'bold', color: COLORS.text.primary, letterSpacing: 1 },
    shareBtn: { backgroundColor: COLORS.text.primary, borderRadius: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    shareBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    helperText: { textAlign: 'center', color: '#999', fontSize: 12, marginTop: 10, marginBottom: 30 },

    // Steps
    stepsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    stepItem: { alignItems: 'center', flex: 1 },
    stepIconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    stepTitle: { fontWeight: 'bold', fontSize: 14, marginBottom: 4, color: '#333' },
    stepDesc: { fontSize: 11, color: '#666', textAlign: 'center', paddingHorizontal: 2 },
    stepLine: { width: 20, height: 1, backgroundColor: '#ddd', marginTop: 25 },

    webContainer: { flex: 1, width: '100%' },
});