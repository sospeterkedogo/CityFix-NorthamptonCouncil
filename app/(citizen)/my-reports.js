import React, { useState, useCallback } from 'react';
import { View, FlatList, Text, StyleSheet, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { TicketService } from '../../src/services/ticketService';
import ExpandableTicketCard from '../../src/components/ExpandableTicketCard';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, STYLES } from '../../src/constants/theme';

import { useClientSearch } from '../../src/hooks/useClientSearch';
import SearchBar from '../../src/components/SearchBar';

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

    // Client-side search for My Reports
    const { searchQuery, setSearchQuery, filteredData, performManualSearch } = useClientSearch(tickets, [
        'title', 'description', 'category', 'status', 'locationName'
    ]);

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
        <ExpandableTicketCard ticket={item} />
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My History</Text>
            </View>

            <View style={[styles.container, Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>

                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSearch={performManualSearch}
                    placeholder="Search your reports..."
                />

                <FlatList
                    data={filteredData}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchMyTickets} />}
                    ListEmptyComponent={
                        <Text style={{ textAlign: 'center', marginTop: 50, color: '#999' }}>
                            {searchQuery ? "No reports found matching your search." : "You haven't reported anything yet."}
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
    container: { flex: 1, paddingTop: 20 },
});