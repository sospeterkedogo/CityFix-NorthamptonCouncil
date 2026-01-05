import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/constants/theme';
import { db } from '../../src/config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function CallScreenWeb() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { user } = useAuth();

    // Params: callId, name (caller/callee name), type ('voice' or 'video')
    const { callId, name, type } = params;
    const containerRef = useRef(null);
    const joinedRef = useRef(false); // IDEMPOTENCY CHECK
    const [callStatus, setCallStatus] = React.useState('ringing'); // ringing, accepted, rejected

    useEffect(() => {
        if (!user || !callId || !containerRef.current || joinedRef.current) return;

        joinedRef.current = true; // Mark as joined

        const startCall = async () => {
            // 1. Get Keys from Env
            const appID = Number(process.env.EXPO_PUBLIC_ZEGO_APP_ID);
            const serverSecret = process.env.EXPO_PUBLIC_ZEGO_SERVER_SECRET;

            if (!appID || !serverSecret) {
                console.error("Missing Zego Keys");
                return;
            }

            // 2. Generate Kit Token (Client-side for dev/demo)
            const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
                appID,
                serverSecret,
                callId,
                user.uid,
                user.name || user.displayName || user.email
            );

            // 3. Create instance
            const zp = ZegoUIKitPrebuilt.create(kitToken);

            // 4. Join Room
            zp.joinRoom({
                container: containerRef.current,
                sharedLinks: [
                    {
                        name: 'Copy Link',
                        url: window.location.href, // Easy sharing
                    },
                ],
                scenario: {
                    mode: type === 'voice'
                        ? ZegoUIKitPrebuilt.OneONOneCall // Or GroupVoiceCall
                        : ZegoUIKitPrebuilt.OneONOneCall, // Default to 1on1, can swap to GroupCall
                },
                showPreJoinView: false, // Jump straight in
                turnOnMicrophoneWhenJoining: true,
                turnOnCameraWhenJoining: type === 'video',
                showMyCameraToggleButton: true,
                showMyMicrophoneToggleButton: true,
                showAudioVideoSettingsButton: true,
                onLeaveRoom: () => {
                    router.back();
                },
                showLeaveRoomConfirmDialog: true,
                showUserList: false,
                showRoomDetailsButton: false,
            });
        };

        startCall();

        // 5. Listen to Call Status (Rejection Handling)
        const unsub = onSnapshot(doc(db, 'calls', callId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCallStatus(data.status);

                if (data.status === 'rejected') {
                    alert('User declined the call.');
                    router.back();
                }
            }
        });

        return () => unsub();
    }, [user, callId, type]);

    if (callStatus === 'rejected') return null; // Avoid rendering if rejected

    return (
        <View style={styles.container}>
            {callStatus === 'ringing' && (
                <div style={{ position: 'absolute', zIndex: 999, top: 40, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '10px 20px', borderRadius: 20 }}>
                    Calling... Waiting for response
                </div>
            )}
            <div
                ref={containerRef}
                style={{
                    width: '100%',
                    height: '100dvh', // Dynamic Viewport Height for mobile browsers
                    maxWidth: 1000,   // Keep desktop constraint on the actual video container
                    margin: '0 auto'  // Center it
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000', // Black background for video calls
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        marginHorizontal: 'auto',
    },
    // We add a wrapper style for the div if needed, but inline style works better for web-specifics
});
