import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import {
    ZegoUIKitPrebuiltCall,
    ONE_ON_ONE_VIDEO_CALL_CONFIG,
    ONE_ON_ONE_VOICE_CALL_CONFIG // <--- Add this import
} from '@zegocloud/zego-uikit-prebuilt-call-rn';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { db } from '../../src/config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const AppID = Number(process.env.EXPO_PUBLIC_ZEGO_APP_ID);
const AppSign = process.env.EXPO_PUBLIC_ZEGO_APP_SIGN;

export default function CallPage() {
    const router = useRouter();
    const { user } = useAuth();

    // 1. Get the 'type' param (video or voice)
    const { callId, name, type } = useLocalSearchParams();
    const [callStatus, setCallStatus] = React.useState('ringing');

    // Listener for Call Status
    React.useEffect(() => {
        if (!callId) return;
        const unsub = onSnapshot(doc(db, 'calls', callId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCallStatus(data.status);

                if (data.status === 'rejected') {
                    // Native Alert
                    alert('User declined the call.');
                    router.back();
                }
            }
        });
        return () => unsub();
    }, [callId]);

    // 2. Choose the right config
    const callConfig = type === 'voice'
        ? ONE_ON_ONE_VOICE_CALL_CONFIG
        : ONE_ON_ONE_VIDEO_CALL_CONFIG;

    if (!AppID || !AppSign) {
        return (
            <View style={styles.center}>
                <Text style={{ color: 'white' }}>Missing Configuration</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {callStatus === 'ringing' && (
                <View style={{ position: 'absolute', zIndex: 999, top: 60, width: '100%', alignItems: 'center' }}>
                    <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 20 }}>
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>Calling... Waiting for response</Text>
                    </View>
                </View>
            )}
            <ZegoUIKitPrebuiltCall
                appID={AppID}
                appSign={AppSign}
                userID={user.uid}
                userName={user.email.split('@')[0]}
                callID={callId}

                config={{
                    ...callConfig,
                    onHangUp: () => {
                        router.back();
                    },
                    showLeaveRoomConfirmDialog: true, // UX Improvement
                    topMenuBarConfig: {
                        buttons: ['minimizing', 'leave'],
                    },
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    center: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
});