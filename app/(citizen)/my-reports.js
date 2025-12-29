import React, { useState, useCallback } from 'react';
import { View, FlatList, Text, StyleSheet, RefreshControl, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { TicketService } from '../../src/services/ticketService';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, STYLES } from '../../src/constants/theme';

export default function MyReportsScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    // Reload data every time this tab is focused (e.g., after submitting a report)
    useFocusEffect(
        useCallback(() => {
            fetchMyTickets();
        }, [])
    );

    const fetchMyTickets = async () => {
        setLoading(true);
        const data = await TicketService.getCitizenTickets(user.uid);
        // Sort: Newest first
        const sorted = data.sort((a, b) => b.createdAt - a.createdAt);
        setTickets(sorted);
        setLoading(false);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'resolved': return COLORS.success;
            case 'verified': return COLORS.success;
            case 'in_progress': return COLORS.warning;
            case 'draft': return '#95a5a6';
            default: return COLORS.error; // Open/Assigned
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: '/(citizen)/ticket/[id]', params: { id: item.id } })}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.badgeText}>{item.status}</Text>
                </View>
            </View>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My History</Text>
            </View>

            <View style={[styles.container, Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>
                <FlatList
                    data={tickets}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchMyTickets} />}
                    ListEmptyComponent={
                        <Text style={{ textAlign: 'center', marginTop: 50, color: '#999' }}>
                            You haven't reported anything yet.
                        </Text>
                    }
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { backgroundColor: 'white', padding: 15, paddingTop: 40, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
    card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, ...STYLES.shadow },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    cardTitle: { fontWeight: 'bold', fontSize: 16, flex: 1, marginRight: 10 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    date: { fontSize: 12, color: '#999', marginBottom: 5 },
    desc: { color: '#555' }
});