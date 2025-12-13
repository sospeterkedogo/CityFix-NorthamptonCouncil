import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SPACING, STYLES } from '../../src/constants/theme';
import { TicketService } from '../../src/services/ticketService';
import { TICKET_STATUS } from '../../src/constants/models';

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load data - wrapped in useFocusEffect so it refreshes when you navigate back
  useFocusEffect(
    useCallback(() => {
      fetchTickets();
    }, [])
  );

  const fetchTickets = async () => {
    // Note: In a real app, you would filter this by the current User ID
    const data = await TicketService.getAllTickets();

    // Sort by newest first
    const sorted = data.sort((a, b) => b.createdAt - a.createdAt);
    setTickets(sorted);
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  // Helper to get status color
  const getStatusColor = (status) => {
    switch (status) {
      case TICKET_STATUS.RESOLVED: return COLORS.success;
      case TICKET_STATUS.IN_PROGRESS: return COLORS.warning;
      case TICKET_STATUS.VERIFIED: return COLORS.action;
      case 'merged': return '#95a5a6'; // Grey (Neutral)
      default: return COLORS.text.secondary; // Draft/Submitted
    }
  };

  const renderTicketItem = ({ item }) => (
    <TouchableOpacity onPress={() => router.push(
      {
        pathname: '/(citizen)/ticket/[id]',
        params: { id: item.id }
      }
    )} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.categoryTag}>
          <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { borderColor: getStatusColor(item.status) }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

      <Text style={styles.cardDate}>
        Reported on {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={STYLES.container}>
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.greeting}>Hello, Citizen</Text>
          <Text style={styles.subGreeting}>Helping keep Northampton safe.</Text>
        </View>
        {/* PROFILE BUTTON */}
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{user?.email?.charAt(0).toUpperCase() || '?'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Primary Action - "The Big Button" */}
      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => router.push('/(citizen)/report')}
      >
        <Text style={styles.actionTitle}>+ Report New Issue</Text>
        <Text style={styles.actionSubtitle}>Spot a problem? Let us know.</Text>
      </TouchableOpacity>

      {/* Ticket List */}
      <Text style={styles.sectionTitle}>My Reports</Text>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={tickets}
          renderItem={renderTicketItem}
          keyExtractor={(item, index) => item.id || String(index)}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No reports yet.</Text>
              <Text style={styles.emptySubText}>You're a model citizen!</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.l,
    marginTop: SPACING.m,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  subGreeting: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.text.secondary,
    opacity: 0.8, // Increased opacity for readability
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  actionCard: {
    backgroundColor: COLORS.primary,
    padding: SPACING.l,
    borderRadius: 16,
    marginBottom: SPACING.xl,
    ...STYLES.shadow,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.light,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#BDC3C7', // Light grey for contrast on dark blue
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.m,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    ...STYLES.shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.s,
  },
  categoryTag: {
    backgroundColor: '#F0F4F8',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.text.secondary,
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: SPACING.s,
  },
  cardDate: {
    fontSize: 12,
    color: '#BDC3C7',
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.secondary,
  },
  emptySubText: {
    fontSize: 14,
    color: '#BDC3C7',
  }
});