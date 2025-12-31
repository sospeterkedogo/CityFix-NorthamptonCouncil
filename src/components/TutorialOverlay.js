import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { COLORS } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// Define the steps for each role
const TUTORIAL_STEPS = {
    citizen: [
        { text: "Welcome, Citizen! This is your feed of local fixes.", target: "feed" },
        { text: "Tap the big (+) button to Report a new issue.", target: "fab" },
    ],
    dispatcher: [
        { text: "Welcome, Dispatcher! These are tickets needing attention.", target: "list" },
        { text: "Click the Map Icon to see tickets geographically.", target: "map_icon" },
    ],
    engineer: [
        { text: "Hi Engineer! These are jobs assigned to you.", target: "jobs" },
        { text: "Click 'Resolve' on a ticket when you finish a job.", target: "resolve" },
    ],
    qa: [
        { text: "Quality Assurance. You verify the Engineer's work.", target: "verify" },
    ]
};

export default function TutorialOverlay({ role, page }) {
    const [stepIndex, setStepIndex] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        checkTutorial();
    }, []);

    const checkTutorial = async () => {
        // Reset logic: We want this to show every time for the demo?
        // If you want it ONCE per install, uncomment the AsyncStorage check below.
        /*
        const hasSeen = await AsyncStorage.getItem(`tutorial_${role}`);
        if (hasSeen) return;
        */
        setVisible(true);
    };

    const handleNext = async () => {
        const steps = TUTORIAL_STEPS[role] || [];
        if (stepIndex < steps.length - 1) {
            setStepIndex(stepIndex + 1);
        } else {
            // Finished
            setVisible(false);
            await AsyncStorage.setItem(`tutorial_${role}`, 'true');
        }
    };

    const steps = TUTORIAL_STEPS[role] || [];
    if (!visible || steps.length === 0) return null;

    const currentStep = steps[stepIndex];

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View style={styles.overlay}>
                <View style={[styles.card, Platform.OS === 'web' && { maxWidth: 500, alignSelf: 'center' }]}>
                    <View style={styles.headerRow}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="information-circle" size={28} color={COLORS.action} />
                        </View>
                        <TouchableOpacity onPress={() => setVisible(false)}>
                            <Ionicons name="close" size={24} color="#CBD5E1" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.text}>{currentStep.text}</Text>

                    <View style={styles.footer}>
                        <View style={styles.dotsContainer}>
                            {steps.map((_, i) => (
                                <View key={i} style={[styles.dot, i === stepIndex && styles.activeDot]} />
                            ))}
                        </View>

                        <TouchableOpacity onPress={handleNext} style={styles.btn}>
                            <Text style={styles.btnText}>
                                {stepIndex === steps.length - 1 ? "Start Demo" : "Next Tip"}
                            </Text>
                            <Ionicons name="arrow-forward" size={16} color="white" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)', // Slate 900 with opacity
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    card: {
        backgroundColor: 'white',
        width: '90%',
        padding: 24,
        borderRadius: 20,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    iconContainer: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: '#F0F9FF', // Sky 50
        justifyContent: 'center', alignItems: 'center',
    },
    text: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1E293B', // Slate 800
        marginBottom: 24,
        lineHeight: 28,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 6,
    },
    dot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: '#E2E8F0',
    },
    activeDot: {
        backgroundColor: COLORS.action,
        width: 20,
    },
    btn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    btnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    }
});