import React from 'react';
import { View, Text, TouchableOpacity, Linking, Platform, Modal, StyleSheet, Dimensions } from 'react-native';
import QRCode from 'react-qr-code'; // Ensure this is installed
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

const DOWNLOAD_URL = "https://drive.google.com/file/d/17-rvI8Js663DsSg-E444NXU_-yrbwsK3/view?usp=sharing";

export default function GetAppModal({ visible, onClose, userEmail }) {
    // Simple check for mobile screen width
    const isMobile = Dimensions.get('window').width < 768;

    const sendLinkToEmail = () => {
        // Opens user's email client with the link pre-filled
        const subject = "Download City Fix for Android";
        const body = `Here is the link to download the app:\n\n${DOWNLOAD_URL}\n\nHappy fixing!`;
        Linking.openURL(`mailto:${userEmail}?subject=${subject}&body=${body}`);
    };

    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" visible={visible}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color="black" />
                    </TouchableOpacity>

                    <Text style={styles.title}>Download on Android</Text>
                    <Text style={styles.subtitle}>
                        For the best experience including Camera and Location features, verify your account on our Android App.
                    </Text>
                    <Text style={[styles.subtitle, { fontStyle: 'italic', marginBottom: 20 }]}>
                        (iOS version coming soon!)
                    </Text>

                    {/* SCENARIO A: User is on Desktop -> Show QR Code */}
                    {!isMobile && (
                        <View style={styles.qrSection}>
                            <Text style={styles.instruction}>Scan with your phone camera:</Text>
                            <View style={styles.qrBorder}>
                                <QRCode value={DOWNLOAD_URL} size={150} />
                            </View>
                        </View>
                    )}

                    {/* SCENARIO B: User is on Mobile Web -> Show Button */}
                    {isMobile && (
                        <TouchableOpacity
                            style={styles.downloadBtn}
                            onPress={() => Linking.openURL(DOWNLOAD_URL)}
                        >
                            <Ionicons name="logo-android" size={24} color="white" style={{ marginRight: 10 }} />
                            <Text style={styles.btnText}>Download APK Now</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.divider} />

                    {/* FALLBACK: Email yourself the link */}
                    <Text style={styles.orText}>OR</Text>
                    <TouchableOpacity onPress={sendLinkToEmail} style={styles.emailBtn}>
                        <Text style={styles.emailText}>Email the link to my phone</Text>
                    </TouchableOpacity>

                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: 'white', borderRadius: 20, padding: 30, width: '90%', maxWidth: 450, alignItems: 'center' },
    closeBtn: { position: 'absolute', top: 15, right: 15 },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    subtitle: { color: '#666', textAlign: 'center', marginBottom: 20 },

    qrSection: { alignItems: 'center', marginBottom: 20 },
    instruction: { marginBottom: 10, fontWeight: 'bold', color: COLORS.primary },
    qrBorder: { padding: 10, backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#eee', ...Platform.select({ web: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } }) },

    downloadBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, alignItems: 'center', marginBottom: 20 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    divider: { height: 1, backgroundColor: '#eee', width: '100%', marginVertical: 10 },
    orText: { position: 'absolute', backgroundColor: 'white', paddingHorizontal: 10, color: '#999', top: -20 }, // Hacky positioning over divider
    emailBtn: { padding: 10 },
    emailText: { color: COLORS.primary, fontWeight: 'bold' }
});