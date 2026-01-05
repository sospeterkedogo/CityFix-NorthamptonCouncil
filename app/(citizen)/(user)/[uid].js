import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, collection, query, where, getDocs, orderBy, onSnapshot, getCountFromServer, updateDoc } from 'firebase/firestore';
import { db } from '../../../src/config/firebase';
import { COLORS, STYLES } from '../../../src/constants/theme';
import FeedCard from '../../../src/components/FeedCard';
import { useAuth } from '../../../src/context/AuthContext';
import { UserService } from '../../../src/services/userService';
import { formatRelativeTime } from '../../../src/utils/dateUtils';

export default function PublicProfile() {
    const { uid } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth(); // Needed for connection check
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [friendStatus, setFriendStatus] = useState('loading'); // none, friends, pending, sent, self
    const [realNeighborCount, setRealNeighborCount] = useState(null);

    useEffect(() => {
        const unsubscribe = setupProfileListener();
        fetchPosts();
        checkFriendStatus();
        return () => unsubscribe && unsubscribe();
    }, [uid, user?.uid]); // Use user.uid for stability

    // Re-fetch accurate count whenever profile updates (or on mount)
    useEffect(() => {
        if (user?.uid) {
            fetchNeighborCount();
        }
    }, [uid, user?.uid, profile?.neighborCount]);

    const fetchNeighborCount = async () => {
        try {
            const coll = collection(db, 'users', uid, 'neighbors');
            const snapshot = await getCountFromServer(coll);
            const count = snapshot.data().count;
            setRealNeighborCount(count);

            // Self-healing: Update Firestore if desynced AND is owner
            if (profile && profile.neighborCount !== count && user?.uid === uid) {
                await updateDoc(doc(db, 'users', uid), { neighborCount: count });
                console.log("Self-healed neighbor count");
            }
        } catch (e) {
            console.error("Failed to fetch accurate neighbor count", e);
        }
    };

    const checkFriendStatus = async () => {
        if (!user || !uid) return;
        if (user.uid === uid) {
            setFriendStatus('self');
            return;
        }

        try {

            // Check if already friends
            const friendSnap = await getDoc(doc(db, 'users', user.uid, 'neighbors', uid));
            if (friendSnap.exists()) {
                setFriendStatus('friends');
                return;
            }

            // Check if request sent by ME
            const sentQ = query(collection(db, 'friend_requests'), where('fromId', '==', user.uid), where('toId', '==', uid), where('status', '==', 'pending'));
            const sentSnap = await getDocs(sentQ);
            if (!sentSnap.empty) {
                setFriendStatus('sent');
                return;
            }

            // Check if request sent by THEM
            const rxQ = query(collection(db, 'friend_requests'), where('fromId', '==', uid), where('toId', '==', user.uid), where('status', '==', 'pending'));
            const rxSnap = await getDocs(rxQ);
            if (!rxSnap.empty) {
                setFriendStatus('pending'); // Action required
                return;
            }

            setFriendStatus('none');
        } catch (e) {
            console.error("Status check failed", e);
            setFriendStatus('none');
        }
    };

    const setupProfileListener = () => {
        setLoading(true);
        const unsubscribe = onSnapshot(doc(db, 'users', uid), (doc) => {
            if (doc.exists()) {
                setProfile(doc.data());
                // Fallback to profile count initially or if fetch fails, but state will override
            }
            setLoading(false);
        }, (error) => {
            console.error("Profile listen error", error);
            setLoading(false);
        });
        return unsubscribe;
    };

    const fetchPosts = async () => {
        try {
            const q = query(
                collection(db, 'tickets'),
                where('userId', '==', uid),
                where('type', '==', 'social'),
                orderBy('createdAt', 'desc')
            );
            const postSnaps = await getDocs(q);
            setPosts(postSnaps.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); }
    };

    const handleSendRequest = async () => {
        if (!profile) return;
        await UserService.sendRequest(user, { id: uid, ...profile });
        setFriendStatus('sent');
        alert("Request Sent!");
    };

    if (loading) return <ActivityIndicator style={{ marginTop: 50 }} />;

    const handleRemoveNeighbor = async () => {
        if (!profile) return;
        // Simple confirmation
        await UserService.removeNeighbor(user.uid, uid, user.name || user.email);
        setFriendStatus('none');
        // Manually decrement local count for immediate feedback
        if (realNeighborCount !== null) {
            setRealNeighborCount(prev => Math.max(0, prev - 1));
        }
        alert("Neighbor Removed.");
    };

    const renderHeader = () => (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            {/* 1. Header Banner */}
            <View style={styles.banner} />

            {/* 2. Profile Content (Overlapping) */}
            <View style={styles.profileContent}>
                {profile && (
                    <>
                        <View style={styles.avatarContainer}>
                            {profile.photoURL && (!profile.photoURL.startsWith('blob:') || profile.photoURL.includes('localhost')) ? (
                                <Image source={{ uri: profile.photoURL }} style={styles.avatarImage} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>
                                        {(profile.displayName || profile.email || 'U').charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}

                            {/* Online/Offline Indicator */}
                            {profile.lastActive && (
                                <View style={[styles.onlineDot, {
                                    backgroundColor: (Date.now() - Number(profile.lastActive) < 300000) ? COLORS.success : '#94A3B8'
                                }]} />
                            )}


                        </View>

                        <Text style={styles.name}>{profile.name || profile.displayName || "Citizen"}</Text>

                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{profile.role || "Community Member"}</Text>
                        </View>

                        {/* Last Seen Text */}
                        {profile.lastActive && (Date.now() - Number(profile.lastActive) > 300000) && (
                            <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 5, fontWeight: '500' }}>
                                Last seen {formatRelativeTime(profile.lastActive)}
                            </Text>
                        )}

                        {/* Stats Row */}
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{posts.length}</Text>
                                <Text style={styles.statLabel}>Posts</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                {/* Use realNeighborCount if available (for self), else fallback to profile.neighborCount */}
                                <Text style={styles.statNumber}>{Math.max(0, realNeighborCount !== null ? realNeighborCount : (profile.neighborCount || 0))}</Text>
                                <Text style={styles.statLabel}>Neighbors</Text>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        {friendStatus !== 'self' ? (
                            <View style={styles.actionRow}>
                                {friendStatus === 'none' && (
                                    <TouchableOpacity onPress={handleSendRequest} style={styles.btnPrimary} activeOpacity={0.8}>
                                        <Text style={styles.btnTextPrimary}>Add Neighbor</Text>
                                    </TouchableOpacity>
                                )}
                                {friendStatus === 'sent' && (
                                    <View style={styles.btnDisabled}>
                                        <Text style={styles.btnTextDisabled}>Request Sent</Text>
                                    </View>
                                )}
                                {friendStatus === 'friends' && (
                                    <>
                                        <TouchableOpacity
                                            style={styles.btnPrimary}
                                            activeOpacity={0.8}
                                            onPress={() => router.push({ pathname: '/(citizen)/chat/[id]', params: { id: uid, name: profile.name || profile.displayName } })}
                                        >
                                            <Text style={styles.btnTextPrimary}>Message</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity onPress={handleRemoveNeighbor} style={styles.btnOutline} activeOpacity={0.6}>
                                            <Text style={styles.btnTextOutline}>Remove Neighbor</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                                {friendStatus === 'pending' && (
                                    <TouchableOpacity onPress={() => router.push('/(citizen)/social')} style={[styles.btnPrimary, { backgroundColor: COLORS.secondary }]}>
                                        <Text style={styles.btnTextPrimary}>Respond to Request</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    onPress={() => router.push('/(citizen)/referrals')}
                                    style={[styles.btnPrimary, { backgroundColor: COLORS.action }]}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.btnTextPrimary}>Invite & Earn £10</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}
            </View>
            <View style={{ width: '100%', paddingHorizontal: 20, marginBottom: 15 }}>
                <Text style={styles.sectionTitle}>Activity</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.screenContainer}>
            <View style={{ flex: 1, maxWidth: 600, width: '100%', alignSelf: 'center' }}>
                <View style={styles.navBar}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 600, alignSelf: 'center' }}>
                        <TouchableOpacity onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                // Fallback if accessed directly (refresh) and no history
                                router.replace('/(citizen)/dashboard');
                            }
                        }} style={styles.backBtn}>
                            <Text style={{ fontSize: 18, color: COLORS.primary }}>←</Text>
                        </TouchableOpacity>
                        <Text style={[styles.navTitle, { color: 'white' }]}>Profile</Text>
                        <View style={{ width: 30 }} />
                    </View>
                </View>

                <FlatList
                    data={posts}
                    renderItem={({ item }) => <FeedCard ticket={item} showDelete={false} />}
                    keyExtractor={i => i.id}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screenContainer: { flex: 1, backgroundColor: 'white' }, // Custom container, no padding

    // Header & Banner
    navBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: 15, flexDirection: 'row', justifyContent: 'space-between' },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', ...STYLES.shadow },
    banner: { width: '100%', height: 150, backgroundColor: COLORS.primary },

    // Profile Info
    profileContent: { alignItems: 'center', marginTop: -60, paddingBottom: 20 },
    avatarContainer: { marginBottom: 15, alignItems: 'center', position: 'relative' },
    avatarImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: 'white', ...STYLES.shadow },
    avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: 'white', ...STYLES.shadow, backgroundColor: '#34495E', justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 40, color: 'white', fontWeight: 'bold' },

    onlineDot: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: COLORS.success,
        borderWidth: 3,
        borderColor: 'white',
        zIndex: 2
    },


    name: { fontSize: 24, fontWeight: 'bold', color: COLORS.text.primary, marginBottom: 5, textAlign: 'center' },
    roleBadge: { backgroundColor: '#E3F2FD', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20 },
    roleText: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5, textTransform: 'uppercase' },

    // Stats
    statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40, marginVertical: 25 },
    statItem: { alignItems: 'center' },
    statNumber: { fontSize: 22, fontWeight: 'bold', color: COLORS.text.primary },
    statLabel: { fontSize: 13, color: '#666', marginTop: 2, fontWeight: '500' },
    statDivider: { height: 30, width: 1, backgroundColor: '#eee' },

    // Actions
    actionRow: { width: '100%', alignItems: 'center', paddingHorizontal: 20, gap: 15 },

    // Standardized Button Styles
    btnPrimary: {
        backgroundColor: COLORS.primary,
        height: 50,
        borderRadius: 25,
        width: '100%',
        maxWidth: 400, // Web constraint
        justifyContent: 'center',
        alignItems: 'center',
        ...STYLES.shadow
    },
    btnTextPrimary: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },

    btnOutline: {
        backgroundColor: 'white',
        height: 50,
        borderWidth: 2,
        borderColor: '#FF6B6B',
        borderRadius: 25,
        width: '100%',
        maxWidth: 400,
        justifyContent: 'center',
        alignItems: 'center'
    },
    btnTextOutline: { color: '#FF6B6B', fontWeight: 'bold', fontSize: 16 },

    btnDisabled: {
        backgroundColor: '#F0F0F0',
        height: 50,
        borderRadius: 25,
        width: '100%',
        maxWidth: 400,
        justifyContent: 'center',
        alignItems: 'center'
    },
    btnTextDisabled: { color: '#999', fontWeight: 'bold' },

    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text.primary, marginLeft: 5 },
});