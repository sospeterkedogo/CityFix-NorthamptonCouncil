import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/theme';
import { Audio } from 'expo-av'; // Use Expo AV for cross-platform sound

export default function IncomingCallModal({ visible, callerName, callType, onAccept, onDecline }) {
    const [sound, setSound] = useState();

    useEffect(() => {
        let soundObject = null;

        async function playRing() {
            if (visible) {
                // Loop a ringtone
                // For now, we simulate with a simple pattern or just UI if no asset
                // Ideally load a sound file here.
                // console.log("Ringing...");
            }
        }

        if (visible) playRing();

        return () => {
            if (soundObject) soundObject.unloadAsync();
        };
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={styles.container}>
                <View style={styles.callerInfo}>
                    <View style={styles.avatarLarge}>
                        <Text style={{ fontSize: 40, color: 'white' }}>
                            {callerName ? callerName.charAt(0).toUpperCase() : '?'}
                        </Text>
                    </View>
                    <Text style={styles.callerName}>{callerName || 'Unknown Caller'}</Text>
                    <Text style={styles.callType}>Incoming {callType === 'video' ? 'Video' : 'Voice'} Call...</Text>
                </View>

                <View style={styles.actions}>
                    {/* DECLINE */}
                    <TouchableOpacity onPress={onDecline} style={[styles.btn, styles.btnDecline]}>
                        <Ionicons name="call" size={32} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
                    </TouchableOpacity>

                    {/* ACCEPT */}
                    <TouchableOpacity onPress={onAccept} style={[styles.btn, styles.btnAccept]}>
                        <Ionicons name={callType === 'video' ? "videocam" : "call"} size={32} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        justifyContent: 'space-between',
        paddingVertical: 100,
        alignItems: 'center'
    },
    callerInfo: {
        alignItems: 'center',
        marginTop: 50
    },
    avatarLarge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
    },
    callerName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 10
    },
    callType: {
        fontSize: 16,
        color: '#ccc'
    },
    actions: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-evenly',
        marginBottom: 50
    },
    btn: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        ...Platform.select({
            web: { cursor: 'pointer' }
        })
    },
    btnAccept: {
        backgroundColor: '#22c55e'
    },
    btnDecline: {
        backgroundColor: '#ef4444'
    }
});
