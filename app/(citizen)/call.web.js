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

    // Params: callId, name (caller/callee name), type ('voice' or 'video')
    const { callId, name, type, sessionUid } = params;

    // USE STATE FOR CONTAINER TO ENSURE DOM IS READY BEFORE JOINING
    const [containerEl, setContainerEl] = React.useState(null);

    const joinedRef = useRef(false); // IDEMPOTENCY CHECK
    const [callStatus, setCallStatus] = React.useState('ringing'); // ringing, accepted, rejected

    const zpRef = useRef(null); // Ref to hold Zego instance for cleanup

    const isEndingRef = useRef(false); // Ref to track if we are intentionally ending the call
    const unsubRef = useRef(null); // Ref to hold snapshot listener

    // Synced Ref for Cleanup Closure
    const callStatusRef = useRef(callStatus);
    useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);

    const timeOutRef = useRef(null); // Ref to hold the startup timer
    const lonelyTimeoutRef = useRef(null); // Ref for lonely timer

    // HELPER: CENTRALIZED SAFE DESTROY
    const safeDestroy = () => {
        // 1. Clear any pending startup timers
        if (timeOutRef.current) {
            clearTimeout(timeOutRef.current);
            timeOutRef.current = null;
        }

        // 2. Clear lonely timer
        if (lonelyTimeoutRef.current) {
            clearTimeout(lonelyTimeoutRef.current);
            lonelyTimeoutRef.current = null;
        }

        // 3. Destroy Zego Instance if exists
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

    // 7. SEPARATE CLEANUP EFFECT (Only runs on unmount)
    useEffect(() => {
        return () => {
            console.log("Component Unmounting: Safe Destroy");
            safeDestroy();

            // Ensure remote termination on unmount if needed
            if (joinedRef.current && !isEndingRef.current && callStatusRef.current !== 'ended') {
                updateDoc(doc(db, 'calls', callId), {
                    status: 'ended',
                    endedAt: Date.now()
                }).catch(e => { });
            }
            joinedRef.current = false;
        };
    }, []); // Empty dependency = Run only on Unmount (or use [callId] if needed)

    // 8. STARTUP EFFECT (Runs when status/container changes)
    useEffect(() => {
        // 1. Prerequisites
        if (!user || !callId || !containerEl) return;
        if (callStatus !== 'accepted') return;

        // 2. Idempotency (Check if we are already initiating)
        // Note: We don't set true here yet to handle Strict Mode unmounts cleanly
        if (joinedRef.current) return;

        console.log("Status Accepted & Container Ready -> Starting Call");

        const startCall = async () => {
            const appID = Number(process.env.EXPO_PUBLIC_ZEGO_APP_ID);
            const serverSecret = process.env.EXPO_PUBLIC_ZEGO_SERVER_SECRET;
            if (!appID || !serverSecret) return;

            // 2. Generate Kit Token
            // Use stable sessionUid from params if available, else fallback to random (random only good for one-off)
            const mySessionId = sessionUid || `${user.uid}_${Math.floor(Math.random() * 10000)}`;
            console.log("Using Session ID:", mySessionId);

            const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
                appID, serverSecret, callId, mySessionId,
                userData?.username || userData?.name || user.displayName || user.email
            );

            // 3. Create instance & Assign to Ref
            // Removing pre-emptive destroy as it causes Black Screen (race condition with HW locks)
            // relying on Effect cleanup (Effect 7) to handle previous mount

            console.log("Creating Zego Instance...");
            zpRef.current = ZegoUIKitPrebuilt.create(kitToken);

            // 4. Join Room - with delay to ensure DOM paint
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

                // MARK AS JOINED HERE
                // This prevents Strict Mode unmounts (which happen before timeout) 
                // from triggering the "Call Ended" DB update.
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

                    // LONELY TIMEOUT LOGIC
                    onJoinRoom: () => {
                        console.log("Joined Room. Starting Lonely Timer (10s)...");
                        // Start timer immediately. If other user is there, onUserJoin will fire and clear it.
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
                        // If everyone leaves and I'm alone, restart the kicker
                        // Note: Zego might not give total count easily here, but for 1on1, if anyone leaves, it's bad.
                        console.log("User Left. Restarting Lonely Timer (5s)...");
                        // Give 5s grace period for refresh
                        lonelyTimeoutRef.current = setTimeout(() => {
                            console.warn("Lonely Timeout! Peer left and didn't return. Ending call.");
                            performSafeExit();
                        }, 5000);
                    },

                    onLeaveRoom: async () => {
                        isEndingRef.current = true;
                        if (lonelyTimeoutRef.current) clearTimeout(lonelyTimeoutRef.current);
                        if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
                        // React cleanup will handle destruction
                        try {
                            await updateDoc(doc(db, 'calls', callId), {
                                status: 'ended',
                                endedAt: Date.now()
                            });
                        } catch (e) { }
                        // router.back(); -> Handled by SafeExit
                        performSafeExit();
                    },
                    showLeaveRoomConfirmDialog: true,
                    showUserList: false,
                    showRoomDetailsButton: false,
                });
            }, 1000); // Increased to 1000ms for safety
        };
        startCall();

    }, [callStatus, containerEl, user?.uid, callId, type]); // Deps for STARTUP only

    // Helper to determine return URL and force reload (Hard Reset)
    // This solves the "Zego Memory Leak" issue on subsequent calls
    const performSafeExit = () => {
        try {
            // Parse friendId from callId (format: uid1_uid2_timestamp)
            // We need to find which ID is NOT the current user
            if (callId) {
                const parts = callId.split('_');
                // parts[0] is uid1, parts[1] is uid2, parts[2] is timestamp
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

        // Fallback
        console.log("Hard Resetting to Dashboard");
        window.location.href = '/(citizen)/dashboard';
    };

    // 6. Navigate back when status becomes 'ended' or 'rejected' (Reactive Exit)
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

    // Listener for Call Status (Rejection/End/Accept Handling)
    useEffect(() => {
        if (!callId) return;
        const unsub = onSnapshot(doc(db, 'calls', callId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCallStatus(data.status);

                // Also update Ref immediately for safety
                callStatusRef.current = data.status;

                if (data.status === 'rejected' || data.status === 'ended' || data.status === 'canceled') {
                    // If we are already ending the call ourselves, DO NOT trigger back() again
                    if (isEndingRef.current) return;

                    // STOP LISTENING to prevent crash on remote termination
                    if (unsubRef.current) {
                        unsubRef.current();
                        unsubRef.current = null;
                    }

                    // FOR REMOTE END/REJECT: We DO NOT destroy or navigate here. 
                    // We let the state update (setCallStatus) trigger the Effects.
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

    // REMOVED IMMEDIATE NULL RETURN TO ALLOW UI FEEDBACK
    // if (callStatus === 'rejected') return null;

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
                // ACCEPTED - SHOW ZEGO VIDEO
                <div
                    key="zego-video-container" // Force distinct element identity
                    ref={setContainerEl} // Use Setter as Ref Callback
                    style={{
                        width: '100%',
                        height: '100dvh', // Dynamic Viewport Height for mobile browsers
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
        backgroundColor: '#000', // Black background for video calls
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        marginHorizontal: 'auto',
    },
    // We add a wrapper style for the div if needed, but inline style works better for web-specifics
});
