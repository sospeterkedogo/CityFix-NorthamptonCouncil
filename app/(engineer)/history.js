import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { TicketService } from '../../src/services/ticketService';
import { COLORS, SPACING, STYLES } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

import { useClientSearch } from '../../src/hooks/useClientSearch';
import SearchBar from '../../src/components/SearchBar';

export default function EngineerHistory() {
    const { user } = useAuth();
    const router = useRouter();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadHistory();
        }, [])
    );

    const loadHistory = async () => {
        setLoading(true);
        if (!user?.uid) return;

        const allJobs = await TicketService.getEngineerJobs(user.uid);
        // Filter for completed work
        const completed = allJobs.filter(job =>
            job.status === 'resolved' || job.status === 'verified'
        );

        // Sort by most recently updated
        completed.sort((a, b) => (b.resolvedAt || b.updatedAt || 0) - (a.resolvedAt || a.updatedAt || 0));

        setHistory(completed);
        setLoading(false);
    };

    // Hook for client-side search
    const { searchQuery, setSearchQuery, filteredData, performManualSearch } = useClientSearch(history, [
        'title', 'description', 'resolutionNotes', 'locationName'
    ]);

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Recently';
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const renderHistoryItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.statusBadge}>
                    <Ionicons
                        name={item.status === 'verified' ? "checkmark-done-circle" : "checkmark-circle"}
                        size={16}
                        color="white"
                        style={{ marginRight: 4 }}
                    />
                    <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>
                <Text style={styles.date}>
                    {formatDate(item.resolvedAt)}
                </Text>
            </View>

            <Text style={styles.jobTitle}>{item.title}</Text>
            <Text style={styles.jobDesc} numberOfLines={2}>{item.description}</Text>

            {item.resolutionNotes && (
                <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>My Notes:</Text>
                    <Text style={styles.notesText} numberOfLines={2}>{item.resolutionNotes}</Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={STYLES.container}>
            <View style={[styles.content, Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Past Jobs</Text>
                    <Text style={styles.headerSub}>Your history of completed fixes</Text>
                </View>

                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSearch={performManualSearch}
                    placeholder="Search past jobs..."
                />

                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={filteredData}
                        renderItem={renderHistoryItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="time-outline" size={48} color={COLORS.text.secondary} />
                                <Text style={styles.emptyText}>
                                    {searchQuery ? "No matching jobs found." : "No past jobs yet."}
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    content: { flex: 1 },
    header: { marginBottom: 20, marginTop: 10 },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary },
    headerSub: { fontSize: 16, color: COLORS.text.secondary },

    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        ...Platform.select({
            web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
            default: { elevation: 2 }
        })
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    statusBadge: {
        backgroundColor: COLORS.success,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center'
    },
    statusText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    date: { color: '#94A3B8', fontSize: 12 },

    jobTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 6 },
    jobDesc: { fontSize: 14, color: '#64748B', marginBottom: 16 },

    notesBox: {
        backgroundColor: '#F1F5F9',
        padding: 12,
        borderRadius: 8,
    },
    notesLabel: { fontSize: 12, fontWeight: 'bold', color: '#475569', marginBottom: 4 },
    notesText: { fontSize: 13, color: '#334155', fontStyle: 'italic' },

    emptyState: { alignItems: 'center', marginTop: 50 },
    emptyText: { color: '#94A3B8', fontSize: 16, marginTop: 10 }
});
