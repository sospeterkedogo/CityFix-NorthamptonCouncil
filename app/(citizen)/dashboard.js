import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator, Modal, Platform
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, STYLES } from '../../src/constants/theme';
import { TicketService } from '../../src/services/ticketService';
import { TICKET_STATUS } from '../../src/constants/models';
import SimpleExpandableRow from '../../src/components/SimpleExpandableRow';
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
      default: return COLORS.text.secondary; // Draft/Submitted
    }
  };

  // Stats Calculation
  const stats = {
    total: tickets.length,
    active: tickets.filter(t => t.status === 'in_progress' || t.status === 'assigned').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'verified').length
  };

  return (
    <View style={[STYLES.container, Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>

      {/* --- HEADER --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hello, {user?.displayName || 'Citizen'}!</Text>
          <Text style={styles.subText}>Here is your impact overview</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/profile')} style={styles.profileIcon}>
          <Text style={styles.profileInitial}>{(user?.email || 'U').charAt(0).toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* --- STATS CARDS --- */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Reports</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: COLORS.warning }]}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: COLORS.success }]}>{stats.resolved}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>

      {/* --- MAIN ACTION --- */}
      <TouchableOpacity
        style={styles.mainAction}
        onPress={() => router.push('/(citizen)/report')}
        activeOpacity={0.9}
      >
        <View style={styles.actionIconCircle}>
          <Ionicons name="add" size={32} color="white" />
        </View>
        <View>
          <Text style={styles.mainActionTitle}>Report an Issue</Text>
          <Text style={styles.mainActionSub}>Help fix your community</Text>
        </View>
      </TouchableOpacity>

      {/* --- DRAFTS --- */}
      {drafts.length > 0 && (
        <TouchableOpacity
          style={styles.draftAlert}
          onPress={() => setShowDraftsModal(true)}
        >
          <Ionicons name="document-text" size={20} color={COLORS.primary} />
          <Text style={styles.draftText}>Resume {drafts.length} Unfinished {drafts.length === 1 ? 'Report' : 'Reports'}</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      )}

      {/* --- RECENT ACTIVITY (Simplified) --- */}
      <Text style={styles.sectionHeader}>Recent Activity</Text>

      <FlatList
        data={tickets.slice(0, 5)} // Only show last 5
        renderItem={({ item }) => <SimpleExpandableRow ticket={item} />}
        keyExtractor={(item) => item.id}
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={40} color="#ccc" />
            <Text style={styles.emptyText}>No recent activity.</Text>
          </View>
        }
      />

      {/* Drafts Modal (Preserved) */}
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
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowDraftsModal(false)}>
              <Text style={{ color: COLORS.text.light, fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  welcomeText: { fontSize: 22, fontWeight: 'bold', color: '#202124' },
  subText: { fontSize: 14, color: '#5f6368' },
  profileIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  profileInitial: { color: 'white', fontWeight: 'bold', fontSize: 18 },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statCard: {
    flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 12, alignItems: 'center', marginHorizontal: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
  },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, marginBottom: 5 },
  statLabel: { fontSize: 12, color: '#666', fontWeight: '600', textTransform: 'uppercase' },

  // Main Action
  mainAction: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary, padding: 20, borderRadius: 16, marginBottom: 20,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
  },
  actionIconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  mainActionTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  mainActionSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },

  // Drafts
  draftAlert: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', padding: 12, borderRadius: 8, marginBottom: 20,
    borderWidth: 1, borderColor: '#FFE0B2'
  },
  draftText: { flex: 1, color: '#E65100', fontWeight: '600', marginLeft: 10 },

  // Recent Activity
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  simpleRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 10,
    borderBottomWidth: 1, borderColor: '#f0f0f0'
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 15 },
  simpleTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  simpleDate: { fontSize: 12, color: '#999' },

  emptyState: { alignItems: 'center', padding: 30 },
  emptyText: { color: '#999', marginTop: 10 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: COLORS.primary },
  draftItem: { padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
  draftItemTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text.primary },
  draftItemDate: { fontSize: 12, color: '#999', marginTop: 4 },
  closeModalBtn: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
});