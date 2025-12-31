import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../../src/config/firebase';
import { COLORS, STYLES } from '../../../src/constants/theme';
import FeedCard from '../../../src/components/FeedCard'; // Reuse your card!

export default function PublicProfile() {
    const { uid } = useLocalSearchParams();
    const router = useRouter();
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, [uid]);

    const fetchProfile = async () => {
        try {
            // 1. Get User Info
            const userSnap = await getDoc(doc(db, 'users', uid));
            if (userSnap.exists()) {
                setProfile(userSnap.data());
            }

            // 2. Get Their Posts
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

    if (loading) return <ActivityIndicator style={{ marginTop: 50 }} />;

    return (
        <View style={STYLES.container}>
            <View style={{ flex: 1, maxWidth: 600, width: '100%', alignSelf: 'center' }}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 10 }}>
                    <Text style={{ color: COLORS.action }}>← Back</Text>
                </TouchableOpacity>

                {profile && (
                    <View style={styles.header}>
                        <View style={styles.avatarContainer}>
                            {profile.photoURL ? (
                                <Image source={{ uri: profile.photoURL }} style={styles.avatarImage} />
                            ) : (
                                <View style={[styles.avatarImage, { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }]}>
                                    <Text style={{ fontSize: 32, color: 'white', fontWeight: 'bold' }}>
                                        {(profile.displayName || profile.email || 'U').charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.name}>{profile.displayName || profile.email?.split('@')[0] || "Citizen"}</Text>
                        <Text style={styles.role}>{profile.role || "Citizen"}</Text>

                        {/* Optional: Add Stats Row if available (e.g. joined date) */}
                        <View style={{ flexDirection: 'row', marginTop: 10, gap: 15 }}>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{posts.length}</Text>
                                <Text style={{ color: '#999', fontSize: 12 }}>Posts</Text>
                            </View>
                        </View>
                    </View>
                )}

                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <FlatList
                    data={posts}
                    renderItem={({ item }) => <FeedCard ticket={item} showDelete={true} />}
                    keyExtractor={i => i.id}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: { alignItems: 'center', padding: 25, backgroundColor: 'white', borderRadius: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    avatarContainer: { marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 },
    avatarImage: { width: 100, height: 100, borderRadius: 50 },
    name: { fontSize: 24, fontWeight: 'bold', color: COLORS.text.primary, marginBottom: 5 },
    role: { color: COLORS.primary, textTransform: 'uppercase', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 15, marginHorizontal: 5, color: COLORS.text.primary }
});