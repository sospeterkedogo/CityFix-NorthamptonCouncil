import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import {
    ZegoUIKitPrebuiltCall,
    ONE_ON_ONE_VIDEO_CALL_CONFIG,
    ONE_ON_ONE_VOICE_CALL_CONFIG
} from '@zegocloud/zego-uikit-prebuilt-call-rn';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { db } from '../../src/config/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

const AppID = Number(process.env.EXPO_PUBLIC_ZEGO_APP_ID);
const AppSign = process.env.EXPO_PUBLIC_ZEGO_APP_SIGN;

export default function CallPage() {
    const router = useRouter();
    const { user, userData } = useAuth();

    // 1. Get the 'type' param (video or voice)
    const { callId, name, type } = useLocalSearchParams();
    const [callStatus, setCallStatus] = React.useState('ringing');
    const callStatusRef = React.useRef(callStatus);
    React.useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);
    const isEndingRef = React.useRef(false);

    React.useEffect(() => {
        console.log("CallPage Mounted. CallID:", callId, "Type:", type, "User:", user?.uid);
        if (!callId || !user) {
            console.warn("Missing callId or user, backing out in 3s...");
            // setTimeout(() => router.back(), 3000); 
        }

        return () => {
            if (!isEndingRef.current && callStatusRef.current !== 'ended') {
                updateDoc(doc(db, 'calls', callId), { status: 'ended' }).catch(e => console.log("Cleanup error", e));
            }
        };
    }, [callId, user]);

    if (!user) return <View style={styles.center}><Text style={{ color: 'white' }}>Loading User...</Text></View>;
    if (!callId) return <View style={styles.center}><Text style={{ color: 'white' }}>Initializing Call...</Text></View>;

    const unsubRef = React.useRef(null);

    React.useEffect(() => {
        if (!callId) return;
        const unsub = onSnapshot(doc(db, 'calls', callId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCallStatus(data.status);
                callStatusRef.current = data.status;

                if (data.status === 'rejected' || data.status === 'ended' || data.status === 'canceled') {
                    if (isEndingRef.current) return;

                    if (unsubRef.current) {
                        unsubRef.current();
                        unsubRef.current = null;
                    }

                    if (data.status === 'rejected') alert('User declined the call.');
                    router.back();
                }
            }
        });
        unsubRef.current = unsub;
        return () => unsub();
    }, [callId]);

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
            {callStatus !== 'accepted' ? (
                <View style={styles.center}>
                    <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
                        {callStatus === 'ringing' ? "Calling..." : "Connecting..."}
                    </Text>
                    <Text style={{ color: '#aaa' }}>Waiting for response...</Text>
                </View>
            ) : (
                callId && (
                    <ZegoUIKitPrebuiltCall
                        key={callId}
                        appID={AppID}
                        appSign={AppSign}
                        userID={user.uid}
                        userName={userData?.username || user.displayName || user.email.split('@')[0]}
                        callID={callId}

                        config={{
                            ...callConfig,
                            turnOnCameraWhenJoining: type !== 'voice',
                            turnOnMicrophoneWhenJoining: true,
                            useSpeakerWhenJoining: true,

                            onHangUp: async () => {
                                isEndingRef.current = true;
                                try {
                                    await updateDoc(doc(db, 'calls', callId), { status: 'ended' });
                                } catch (e) { console.warn("Error ending call", e); }
                                router.back();
                            },
                            showLeaveRoomConfirmDialog: true,
                            topMenuBarConfig: {
                                buttons: ['minimizing', 'leave'],
                            },
                            onOnlySelfInRoom: () => {
                                router.back();
                            },
                        }}
                    />
                )
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    center: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
});