import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator, Modal
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, STYLES } from '../../src/constants/theme';
import { TicketService } from '../../src/services/ticketService';
import { TICKET_STATUS } from '../../src/constants/models';
import { Ionicons } from '@expo/vector-icons';

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [showDraftsModal, setShowDraftsModal] = useState(false);

  // Data refresh handler
  useFocusEffect(
    useCallback(() => {
      fetchTickets();
      checkDrafts();
    }, [])
  );

  const checkDrafts = async () => {
    try {
      const json = await AsyncStorage.getItem('report_drafts');
      if (json) {
        setDrafts(JSON.parse(json));
      } else {
        setDrafts([]);
      }
    } catch (e) {
      console.log("Error checking drafts", e);
    }
  };

  const fetchTickets = async () => {
    const data = await TicketService.getCitizenTickets(user.uid);
    const sorted = data.sort((a, b) => b.createdAt - a.createdAt);
    setTickets(sorted);
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  // Status color mapping
  const getStatusColor = (status) => {
    switch (status) {
      case TICKET_STATUS.RESOLVED: return COLORS.success;
      case TICKET_STATUS.IN_PROGRESS: return COLORS.warning;
      case TICKET_STATUS.VERIFIED: return COLORS.action;
      case TICKET_STATUS.UNDER_REVIEW: return '#8e44ad'; // Purple
      case 'merged': return '#95a5a6'; // Neutral
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
          <Text style={styles.greeting}>Welcome Back</Text>
          <Text style={styles.subGreeting}>Helping keep Northampton safe.</Text>
        </View>
        {/* Profile Button */}
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <View style={styles.avatarPlaceholder}>
            {user?.email ? (
              <Text style={styles.avatarText}>{user.email.charAt(0).toUpperCase()}</Text>
            ) : (
              <Ionicons name="person" size={20} color="white" />
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Action Card */}
      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => router.push('/(citizen)/report')}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
          <Ionicons name="add-circle-outline" size={24} color={COLORS.text.light} style={{ marginRight: 8 }} />
          <Text style={styles.actionTitle}>Report New Issue</Text>
        </View>
        <Text style={styles.actionSubtitle}>Spot a problem? Let us know.</Text>
      </TouchableOpacity>

      {/* Resume Drafts UI */}
      {drafts.length > 0 && (
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: 'white', borderWidth: 2, borderColor: COLORS.primary, marginBottom: SPACING.l }]}
          onPress={() => setShowDraftsModal(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
            <Ionicons name="document-text-outline" size={22} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.actionTitle, { color: COLORS.primary }]}>Resume Saved Drafts</Text>
          </View>
          <Text style={[styles.actionSubtitle, { color: COLORS.text.secondary }]}>
            You have {drafts.length} unfinished {drafts.length === 1 ? 'report' : 'reports'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Drafts Modal */}
      <Modal visible={showDraftsModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Draft</Text>

            <FlatList
              data={drafts}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.draftItem}
                  onPress={() => {
                    setShowDraftsModal(false);
                    router.push({ pathname: '/(citizen)/report', params: { draftId: item.id } });
                  }}
                >
                  <Text style={styles.draftItemTitle}>{item.title || "Untitled Report"}</Text>
                  <Text style={styles.draftItemDate}>{new Date(item.updatedAt).toLocaleString()}</Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowDraftsModal(false)}
            >
              <Text style={{ color: COLORS.text.light, fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
              <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.text.secondary} style={{ marginBottom: 10 }} />
              <Text style={styles.emptyText}>No reports yet.</Text>
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
    opacity: 0.8,
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
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#BDC3C7', // Light grey for contrast on dark blue
    marginTop: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.primary
  },
  draftItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  draftItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary
  },
  draftItemDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4
  },
  closeModalBtn: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20
  }
});