import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, StyleSheet, StatusBar, Image, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, STYLES } from '../../src/constants/theme';
import { SocialService } from '../../src/services/socialService';
import FeedCard from '../../src/components/FeedCard';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function CommunityFeedScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [feedData, setFeedData] = useState([]);
    const [lastDoc, setLastDoc] = useState(null);
    const [loading, setLoading] = useState(false);
    const [debugMsg, setDebugMsg] = useState(null);

    useEffect(() => {
        fetchFeed(true);
    }, []);

    const fetchFeed = async (isRefresh = false) => {
        if (loading) return;
        setLoading(true);
        setDebugMsg(null);

        const startAfterDoc = isRefresh ? null : lastDoc;
        const { data, lastVisible, debugInfo } = await SocialService.getVerifiedFeed(startAfterDoc);

        if (isRefresh) {
            setFeedData(data);
        } else {
            setFeedData(prev => {
                const existingIds = new Set(prev.map(item => item.id));
                const newItems = data.filter(item => !existingIds.has(item.id));
                return [...prev, ...newItems];
            });
        }

        if (debugInfo) setDebugMsg(debugInfo);

        setLastDoc(lastVisible);
        setLoading(false);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 600 }}>
                    <TouchableOpacity
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: COLORS.action,
                            justifyContent: 'center',
                            alignItems: 'center',
                            ...STYLES.shadow
                        }}
                        onPress={() => router.push('/(citizen)/report')}
                    >
                        <Ionicons name="add" size={28} color="white" />
                    </TouchableOpacity>

                    <Text style={{ fontSize: 22, fontWeight: 'bold', color: COLORS.primary }}>CityFix</Text>

                    <TouchableOpacity onPress={() => router.push('/profile')}>
                        <View style={{
                            width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.text.secondary,
                            justifyContent: 'center', alignItems: 'center', opacity: 0.8
                        }}>
                            {user?.email ? (
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                                    {user.email.charAt(0).toUpperCase()}
                                </Text>
                            ) : (
                                <Ionicons name="person" size={20} color="white" />
                            )}
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.feedContainer}>
                <FlatList
                    data={feedData}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <FeedCard ticket={item} />}
                    contentContainerStyle={{ paddingBottom: 100 }} // Space for bottom tab bar
                    onEndReached={() => fetchFeed(false)}
                    onEndReachedThreshold={0.5}
                    refreshing={loading}
                    onRefresh={() => fetchFeed(true)}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <Ionicons name="home-outline" size={50} color="#ccc" />
                            <Text style={{ color: '#999', marginTop: 10 }}>No verified fixes yet.</Text>
                        </View>
                    }
                    // Responsive styling for desktop
                    style={Platform.OS === 'web' ? { maxWidth: 600, width: '100%', alignSelf: 'center' } : {}}
                />
            </View>


        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    feedContainer: {
        flex: 1,
        // On large screens, centering the container itself can also work, but styling the list is safer for keeping background full width
        width: '100%',
    },
    header: {
        backgroundColor: 'white',
        padding: 15,
        paddingTop: 40, // Adjust for notch
        borderBottomWidth: 1,
        borderColor: '#eee',
        alignItems: 'center'
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
    headerSub: { fontSize: 12, color: '#999' },

    reportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.action,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        ...STYLES.shadow
    },
    reportButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    }
});