import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { UserService } from '../../src/services/userService';
import { COLORS, STYLES } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { formatRelativeTime } from '../../src/utils/dateUtils';

export default function SocialScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [tab, setTab] = useState('neighbors'); // neighbors | requests | search

    const isOnline = (timestamp) => {
        if (!timestamp) return false;
        // Check if within last 5 minutes (300000ms)
        return Date.now() - timestamp < 300000;
    };

    const [neighbors, setNeighbors] = useState([]);
    const [requests, setRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    // 1. Listeners on Mount
    useEffect(() => {
        const unsubNeighbors = UserService.listenToNeighbors(user.uid, setNeighbors);
        const unsubRequests = UserService.listenToRequests(user.uid, setRequests);
        const unsubSent = UserService.listenToSentRequests(user.uid, setSentRequests);
        return () => {
            unsubNeighbors();
            unsubRequests();
            unsubSent();
        };
    }, []);

    // 2. Search Logic (Auto + Manual)
    useEffect(() => {
        const delaySearch = setTimeout(async () => {
            if (searchTerm.length >= 2) {
                const results = await UserService.searchUsers(searchTerm);
                setSearchResults(results.filter(u => u.id !== user.uid));
            } else {
                setSearchResults([]);
            }
        }, 500); // 500ms debounce for auto-search

        return () => clearTimeout(delaySearch);
    }, [searchTerm]);

    const handleSearch = async () => {
        if (searchTerm.length < 2) return;
        setLoading(true);
        const results = await UserService.searchUsers(searchTerm);
        // Filter out self
        setSearchResults(results.filter(u => u.id !== user.uid));
        setLoading(false);
    };

    const sendRequest = async (targetUser) => {
        await UserService.sendRequest(user, targetUser);
        alert("Request Sent!");
        // Reset and Switch to Sent Tab
        setSearchTerm('');
        setSearchResults([]);
        setTab('sent');
    };

    const acceptRequest = async (req) => {
        await UserService.acceptRequest(req.id, req.fromId, user.uid, user.name || user.displayName || user.email);
    };

    const declineRequest = async (req) => {
        await UserService.declineRequest(req.id);
    };

    // 3. Render Items
    const renderNeighbor = ({ item }) => (
        <View style={styles.card}>
            <TouchableOpacity
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                onPress={() => router.push(`/(citizen)/(user)/${item.id}`)}
            >
                <View>
                    <View style={[styles.avatar, item.photoURL ? { backgroundColor: 'transparent' } : { backgroundColor: COLORS.primary }]}>
                        {item.photoURL ? (
                            <Image source={{ uri: item.photoURL }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                        ) : (
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                                {(item.name || item.username || item.email || 'U').charAt(0).toUpperCase()}
                            </Text>
                        )}
                    </View>
                    <View style={[styles.onlineDot, { backgroundColor: isOnline(item.lastActive) ? COLORS.success : '#ccc' }]} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name || item.username || item.email}</Text>
                    <Text style={styles.sub}>View Profile</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={{ padding: 10 }}
                onPress={() => router.push({
                    pathname: '/(citizen)/chat/[id]',
                    params: {
                        id: item.id,
                        name: item.name || item.username || item.email,
                        lastActive: item.lastActive
                    }
                })}
            >
                <Ionicons name="chatbubble-outline" size={24} color={COLORS.primary} />
            </TouchableOpacity>
        </View>
    );

    const renderRequest = ({ item }) => (
        <View style={styles.card}>
            <View style={{ flex: 1 }}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.name}>Request from {item.fromName}</Text>
                    <Text style={styles.sub}>Tap to respond</Text>
                </View>
            </View>
            <TouchableOpacity onPress={() => acceptRequest(item)} style={[styles.btnSmall, { marginRight: 10 }]}>
                <Text style={{ color: 'white' }}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => declineRequest(item)} style={[styles.btnSmall, { backgroundColor: '#FF6B6B' }]}>
                <Text style={{ color: 'white' }}>Decline</Text>
            </TouchableOpacity>
        </View>
    );



    // ... (existing imports)

    // ... (inside component)

    const renderSentRequest = ({ item }) => {
        let statusColor = '#999';
        if (item.status === 'accepted') statusColor = COLORS.primary;
        if (item.status === 'declined') statusColor = '#FF6B6B';

        const date = item.createdAt ? formatRelativeTime(item.createdAt.toDate()) : 'Just now';

        const handleClear = async () => {
            await UserService.clearRequest(item.id);
        };

        return (
            <View style={styles.card}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.name}>To: {item.toName}</Text>
                    <Text style={styles.sub}>{date}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5, backgroundColor: statusColor + '20', marginRight: 10 }}>
                        <Text style={{ color: statusColor, fontWeight: 'bold', textTransform: 'capitalize' }}>{item.status}</Text>
                    </View>
                    {item.status === 'declined' && (
                        <TouchableOpacity onPress={handleClear}>
                            <Ionicons name="trash-outline" size={20} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const renderSearch = ({ item }) => (
        <View style={styles.card}>
            <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name || item.username}</Text>
                <Text style={styles.sub}>@{item.username || 'unknown'}</Text>
            </View>
            <TouchableOpacity onPress={() => sendRequest(item)} style={[styles.btnSmall, { backgroundColor: COLORS.action }]}>
                <Text style={{ color: 'white' }}>Send Request</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={STYLES.container}>
            <View style={styles.webContainer}>
                <Text style={styles.header}>Community</Text>

                {/* TABS */}
                <View style={styles.tabs}>
                    <TouchableOpacity onPress={() => setTab('neighbors')} style={[styles.tab, tab === 'neighbors' && styles.activeTab]}>
                        <Text style={tab === 'neighbors' ? styles.activeText : styles.text}>Neighbors ({neighbors.length})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setTab('requests')} style={[styles.tab, tab === 'requests' && styles.activeTab]}>
                        <Text style={tab === 'requests' ? styles.activeText : styles.text}>Requests ({requests.length})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setTab('sent')} style={[styles.tab, tab === 'sent' && styles.activeTab]}>
                        <Text style={tab === 'sent' ? styles.activeText : styles.text}>Sent ({sentRequests.length})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setTab('search')} style={[styles.tab, tab === 'search' && styles.activeTab]}>
                        <Text style={tab === 'search' ? styles.activeText : styles.text}>Find</Text>
                    </TouchableOpacity>
                </View>

                {/* CONTENT */}
                {tab === 'neighbors' && (
                    <FlatList data={neighbors} renderItem={renderNeighbor} ListEmptyComponent={<Text style={styles.empty}>No neighbors yet.</Text>} />
                )}

                {tab === 'requests' && (
                    <FlatList
                        data={requests.filter(r => r.status === 'pending')}
                        renderItem={renderRequest}
                        ListEmptyComponent={<Text style={styles.empty}>No pending requests.</Text>}
                    />
                )}

                {tab === 'sent' && (
                    <FlatList data={sentRequests} renderItem={renderSentRequest} ListEmptyComponent={<Text style={styles.empty}>No sent requests.</Text>} />
                )}

                {tab === 'search' && (
                    <View style={{ flex: 1 }}>
                        <View style={styles.searchRow}>
                            <Ionicons name="search" size={20} color={COLORS.primary} style={{ marginLeft: 10 }} />
                            <TextInput
                                style={styles.input}
                                placeholder="Search by username..."
                                value={searchTerm}
                                onChangeText={setSearchTerm}
                                autoCapitalize="none"
                                onSubmitEditing={handleSearch}
                            />
                            <TouchableOpacity onPress={handleSearch} style={styles.searchBtn}>
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>Search</Text>
                            </TouchableOpacity>
                        </View>
                        {searchResults.length > 0 && (
                            <Text style={styles.resultLabel}>Suggestions</Text>
                        )}
                        <FlatList
                            data={searchResults}
                            renderItem={renderSearch}
                            ListEmptyComponent={searchTerm.length > 2 ? <Text style={styles.empty}>No user found.</Text> : null}
                        />
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    webContainer: {
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
        flex: 1,
    },
    header: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, marginBottom: 15 },
    tabs: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderColor: '#eee' },
    tab: { marginRight: 20, paddingBottom: 10 },
    activeTab: { borderBottomWidth: 2, borderColor: COLORS.primary },
    text: { color: '#999' },
    activeText: { color: COLORS.primary, fontWeight: 'bold' },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, ...STYLES.shadow },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    name: { fontWeight: 'bold' },
    sub: { fontSize: 12, color: '#999' },
    empty: { textAlign: 'center', color: '#999', marginTop: 20 },

    // Search Styles
    searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 20 },
    input: { flex: 1, padding: 12 },
    resultLabel: { fontSize: 12, fontWeight: 'bold', color: '#999', marginBottom: 10, textTransform: 'uppercase' },

    btnSmall: { backgroundColor: COLORS.primary, paddingVertical: 5, paddingHorizontal: 15, borderRadius: 5 },
    onlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 8,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: 'white'
    }
});