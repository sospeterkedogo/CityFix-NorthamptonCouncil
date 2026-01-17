import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/constants/theme';
import { db } from '../../src/config/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

export default function CallScreenWeb() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { user, userData } = useAuth();

    const { callId, name, type, sessionUid } = params;

    const [containerEl, setContainerEl] = React.useState(null);

    const joinedRef = useRef(false);
    const [callStatus, setCallStatus] = React.useState('ringing');

    const zpRef = useRef(null);

    const isEndingRef = useRef(false);
    const unsubRef = useRef(null);

    const callStatusRef = useRef(callStatus);
    useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);

    const timeOutRef = useRef(null);
    const lonelyTimeoutRef = useRef(null);

    const safeDestroy = () => {
        if (timeOutRef.current) {
            clearTimeout(timeOutRef.current);
            timeOutRef.current = null;
        }

        if (lonelyTimeoutRef.current) {
            clearTimeout(lonelyTimeoutRef.current);
            lonelyTimeoutRef.current = null;
        }
        if (zpRef.current) {
            try {
                console.log("SafeDestroy: Destroying Zego Instance");
                zpRef.current.destroy();
            } catch (e) {
                console.warn("SafeDestroy Error (ignoring):", e);
            }
            zpRef.current = null;
        }
    };

    useEffect(() => {
        return () => {
            console.log("Component Unmounting: Safe Destroy");
            safeDestroy();

            if (joinedRef.current && !isEndingRef.current && callStatusRef.current !== 'ended') {
                updateDoc(doc(db, 'calls', callId), {
                    status: 'ended',
                    endedAt: Date.now()
                }).catch(e => { });
            }
            joinedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!user || !callId || !containerEl) return;
        if (callStatus !== 'accepted') return;
        if (joinedRef.current) return;

        console.log("Status Accepted & Container Ready -> Starting Call");

        const startCall = async () => {
            const appID = Number(process.env.EXPO_PUBLIC_ZEGO_APP_ID);
            const serverSecret = process.env.EXPO_PUBLIC_ZEGO_SERVER_SECRET;
            if (!appID || !serverSecret) return;

            const mySessionId = sessionUid || `${user.uid}_${Math.floor(Math.random() * 10000)}`;
            console.log("Using Session ID:", mySessionId);

            const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
                appID, serverSecret, callId, mySessionId,
                userData?.username || userData?.name || user.displayName || user.email
            );

            console.log("Creating Zego Instance...");
            zpRef.current = ZegoUIKitPrebuilt.create(kitToken);

            console.log("Waiting 1s for DOM to paint...");
            timeOutRef.current = setTimeout(() => {
                if (!zpRef.current) {
                    console.error("Zego Instance missing after delay! Aborting join.");
                    return;
                }
                if (!containerEl) {
                    console.error("Container missing after delay! Aborting join.");
                    return;
                }

                joinedRef.current = true;

                console.log("Joining Room Now...", { container: containerEl });
                zpRef.current.joinRoom({
                    container: containerEl,
                    sharedLinks: [{ name: 'Copy Link', url: window.location.href }],
                    scenario: { mode: ZegoUIKitPrebuilt.OneONOneCall },
                    showPreJoinView: false,
                    turnOnMicrophoneWhenJoining: true,
                    turnOnCameraWhenJoining: type === 'video',
                    showMyCameraToggleButton: true,
                    showMyMicrophoneToggleButton: true,
                    showAudioVideoSettingsButton: true,

                    onJoinRoom: () => {
                        console.log("Joined Room. Starting Lonely Timer (10s)...");
                        lonelyTimeoutRef.current = setTimeout(() => {
                            console.warn("Lonely Timeout! No other users found after 10s. Ending call.");
                            performSafeExit();
                        }, 10000);
                    },
                    onUserJoin: (users) => {
                        if (users && users.length > 0) {
                            console.log("User Joined! Clearing Lonely Timer.");
                            if (lonelyTimeoutRef.current) {
                                clearTimeout(lonelyTimeoutRef.current);
                                lonelyTimeoutRef.current = null;
                            }
                        }
                    },
                    onUserLeave: (users) => {
                        console.log("User Left. Restarting Lonely Timer (5s)...");
                        lonelyTimeoutRef.current = setTimeout(() => {
                            console.warn("Lonely Timeout! Peer left and didn't return. Ending call.");
                            performSafeExit();
                        }, 5000);
                    },

                    onLeaveRoom: async () => {
                        isEndingRef.current = true;
                        if (lonelyTimeoutRef.current) clearTimeout(lonelyTimeoutRef.current);
                        if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
                        try {
                            await updateDoc(doc(db, 'calls', callId), {
                                status: 'ended',
                                endedAt: Date.now()
                            });
                        } catch (e) { }
                        performSafeExit();
                    },
                    showLeaveRoomConfirmDialog: true,
                    showUserList: false,
                    showRoomDetailsButton: false,
                });
            }, 1000);
        };
        startCall();
    }, [callStatus, containerEl, user?.uid, callId, type]);

    const performSafeExit = () => {
        try {
            if (callId) {
                const parts = callId.split('_');
                if (parts.length >= 2) {
                    const otherId = parts[0] === user?.uid ? parts[1] : parts[0];
                    if (otherId) {
                        console.log("Hard Resetting to Chat:", otherId);
                        window.location.href = `/(citizen)/chat/${otherId}`;
                        return;
                    }
                }
            }
        } catch (e) {
            console.error("Error parsing return URL:", e);
        }

        console.log("Hard Resetting to Dashboard");
        window.location.href = '/(citizen)/dashboard';
    };

    useEffect(() => {
        if (isEndingRef.current) return;

        if (callStatus === 'rejected') {
            console.log("Call Rejected details received. Starting auto-exit timer...");
            const timer = setTimeout(() => {
                console.log("Auto-exiting declined call.");
                performSafeExit();
            }, 1500);
            return () => clearTimeout(timer);
        }

        if (callStatus === 'ended') {
            console.log("Call Ended Remotely. Zego should already be destroyed by main effect cleanup.");
            console.log("Navigating back in 1s...");
            const timer = setTimeout(() => {
                performSafeExit();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [callStatus]);

    useEffect(() => {
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

                }
            }
        });
        unsubRef.current = unsub; // Store in Ref
        return () => {
            // Cleanup if unmounting naturally without manual unsubscribe
            if (unsubRef.current) {
                unsubRef.current();
                unsubRef.current = null;
            }
        };
    }, [callId]);

    const handleCancelCall = async () => {
        isEndingRef.current = true;
        try {
            await updateDoc(doc(db, 'calls', callId), { status: 'canceled' }); // or 'ended'
        } catch (e) { console.error(e); }
        performSafeExit();
    };

    const showVideo = callStatus === 'accepted' || callStatus === 'ended';

    return (
        <View style={styles.container}>
            {!showVideo ? (
                // RINGING / WAITING UI
                <View style={{ alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <ActivityIndicator size="large" color={callStatus === 'rejected' ? 'red' : COLORS.primary} style={{ marginBottom: 20 }} />
                    <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                        {callStatus === 'ringing' && "Calling..."}
                        {callStatus === 'rejected' && "Call Declined"}
                        {callStatus !== 'ringing' && callStatus !== 'rejected' && "Connecting..."}
                    </Text>
                    <Text style={{ color: callStatus === 'rejected' ? '#FF4444' : '#ccc', marginTop: 10, marginBottom: 30 }}>
                        {callStatus === 'rejected' ? "User is busy or declined." : "Waiting for response"}
                    </Text>

                    {/* CANCEL BUTTON (Hide if rejected) */}
                    {callStatus !== 'rejected' && callStatus !== 'ended' && (
                        <View style={{ marginTop: 20 }}>
                            <TouchableOpacity
                                onPress={handleCancelCall}
                                style={{
                                    backgroundColor: '#FF4444',
                                    paddingVertical: 12,
                                    paddingHorizontal: 32,
                                    borderRadius: 25,
                                }}
                            >
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>End Call</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* CLOSE BUTTON (Fallback for Rejected) */}
                    {callStatus === 'rejected' && (
                        <View style={{ marginTop: 20 }}>
                            <TouchableOpacity
                                onPress={() => {
                                    if (router.canGoBack()) {
                                        router.back();
                                    } else {
                                        router.replace('/(citizen)/dashboard');
                                    }
                                }}
                                style={{
                                    backgroundColor: '#555',
                                    paddingVertical: 12,
                                    paddingHorizontal: 32,
                                    borderRadius: 25,
                                }}
                            >
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            ) : (
                <div
                    key="zego-video-container"
                    ref={setContainerEl}
                    style={{
                        width: '100%',
                        height: '100dvh',
                        maxWidth: 1000,
                        margin: '0 auto'
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        marginHorizontal: 'auto',
    },
});
