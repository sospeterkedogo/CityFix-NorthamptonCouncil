import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../../src/config/firebase';
import { COLORS, STYLES } from '../../../src/constants/theme';
import FeedCard from '../../../src/components/FeedCard';
import { useAuth } from '../../../src/context/AuthContext';
import { UserService } from '../../../src/services/userService';

export default function PublicProfile() {
    const { uid } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth(); // Needed for connection check
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [friendStatus, setFriendStatus] = useState('loading'); // none, friends, pending, sent, self

    useEffect(() => {
        fetchProfile();
        checkFriendStatus();
    }, [uid, user]);

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

    const fetchProfile = async () => {
        try {
            // Get User Info
            const userSnap = await getDoc(doc(db, 'users', uid));
            if (userSnap.exists()) {
                setProfile(userSnap.data());
            }

            // Get Their Posts
            const q = query(
                collection(db, 'tickets'),
                where('userId', '==', uid),
                where('type', '==', 'social'),
                orderBy('createdAt', 'desc')
            );
            const postSnaps = await getDocs(q);
            setPosts(postSnaps.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); }
        setLoading(false);
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
        alert("Neighbor Removed.");
    };

    const renderHeader = () => (
        <View style={{ alignItems: 'center', paddingBottom: 20 }}>
            {profile && (
                <>
                    <View style={styles.avatarContainer}>
                        {profile.photoURL ? (
                            <Image source={{ uri: profile.photoURL }} style={styles.avatarImage} />
                        ) : (
                            <View style={[styles.avatarImage, { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }]}>
                                <Text style={{ fontSize: 40, color: 'white', fontWeight: 'bold' }}>
                                    {(profile.displayName || profile.email || 'U').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        {/* Status Badge */}
                        {friendStatus === 'friends' && (
                            <View style={styles.connectedBadge}>
                                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>✓</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.name}>{profile.name || profile.displayName || profile.email?.split('@')[0] || "Citizen"}</Text>
                    <Text style={styles.role}>{profile.role || "Community Member"}</Text>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{posts.length}</Text>
                            <Text style={styles.statLabel}>Posts</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>0</Text>
                            <Text style={styles.statLabel}>Neighbors</Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    {friendStatus !== 'self' && (
                        <View style={styles.actionRow}>
                            {friendStatus === 'none' && (
                                <TouchableOpacity onPress={handleSendRequest} style={styles.btnPrimary}>
                                    <Text style={styles.btnTextPrimary}>Add Neighbor</Text>
                                </TouchableOpacity>
                            )}
                            {friendStatus === 'sent' && (
                                <View style={styles.btnDisabled}>
                                    <Text style={styles.btnTextDisabled}>Request Sent</Text>
                                </View>
                            )}
                            {friendStatus === 'friends' && (
                                <View style={{ flexDirection: 'row', gap: 15, width: '100%', paddingHorizontal: 40 }}>
                                    <TouchableOpacity style={[styles.btnPrimary, { flex: 1, backgroundColor: COLORS.action, ...STYLES.shadow }]} onPress={() => router.push({ pathname: '/(citizen)/chat/[id]', params: { id: uid, name: profile.name || profile.displayName } })}>
                                        <Text style={styles.btnTextPrimary}>Message</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleRemoveNeighbor} style={[styles.btnOutline, { flex: 1 }]}>
                                        <Text style={styles.btnTextOutline}>Remove</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            {friendStatus === 'pending' && (
                                <TouchableOpacity onPress={() => router.push('/(citizen)/social')} style={[styles.btnPrimary, { backgroundColor: COLORS.secondary }]}>
                                    <Text style={styles.btnTextPrimary}>Respond to Request</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </>
            )}
            <View style={{ width: '100%', paddingHorizontal: 20, marginTop: 25, marginBottom: 10 }}>
                <Text style={styles.sectionTitle}>Activity</Text>
            </View>
        </View>
    );

    return (
        <View style={STYLES.container}>
            <View style={{ flex: 1, maxWidth: 600, width: '100%', alignSelf: 'center' }}>
                <View style={styles.navBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Text style={{ fontSize: 18, color: COLORS.primary }}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.navTitle}>Profile</Text>
                    <View style={{ width: 30 }} />
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
    navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: 'white' },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#f0f0f0' },
    navTitle: { fontSize: 16, fontWeight: 'bold' },

    // Avatar
    avatarContainer: { marginTop: 20, marginBottom: 15, alignItems: 'center' },
    avatarImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: 'white', ...STYLES.shadow },
    connectedBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: COLORS.success, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },

    name: { fontSize: 26, fontWeight: 'bold', color: COLORS.text.primary, marginBottom: 4 },
    role: { color: COLORS.primary, fontSize: 14, fontWeight: '600', letterSpacing: 0.5, marginBottom: 20 },

    // Stats
    statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40, marginBottom: 25 },
    statItem: { alignItems: 'center' },
    statNumber: { fontSize: 20, fontWeight: 'bold', color: COLORS.text.primary },
    statLabel: { fontSize: 12, color: '#999', marginTop: 2 },
    statDivider: { height: 30, width: 1, backgroundColor: '#eee' },

    // Actions
    actionRow: { width: '100%', alignItems: 'center', paddingHorizontal: 40 },
    btnPrimary: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 30, borderRadius: 30, width: '100%', alignItems: 'center', ...STYLES.shadow },
    btnTextPrimary: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    btnDisabled: { backgroundColor: '#E0E0E0', paddingVertical: 14, borderRadius: 30, width: '100%', alignItems: 'center' },
    btnTextDisabled: { color: '#999', fontWeight: 'bold' },

    btnOutline: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#FF6B6B', paddingVertical: 12, borderRadius: 30, alignItems: 'center' },
    btnTextOutline: { color: '#FF6B6B', fontWeight: 'bold', fontSize: 16 },

    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text.primary },
});