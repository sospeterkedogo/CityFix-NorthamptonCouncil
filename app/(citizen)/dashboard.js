import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, SectionList, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator, Modal, Platform
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, STYLES } from '../../src/constants/theme';
import { TicketService } from '../../src/services/ticketService';
import { SocialService } from '../../src/services/socialService';
import { TICKET_STATUS } from '../../src/constants/models';
import SimpleExpandableRow from '../../src/components/SimpleExpandableRow';
import FeedCard from '../../src/components/FeedCard';
import Toast from '../../src/components/Toast';
import { Ionicons } from '@expo/vector-icons';

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [socialPosts, setSocialPosts] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'resolved', 'social'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [toastVisible, setToastVisible] = useState(false); // Toast State

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
    // Parallel Fetch: Tickets & Posts
    const [ticketData, postData] = await Promise.all([
      TicketService.getCitizenTickets(user.uid),
      SocialService.getUserSocialPosts(user.uid)
    ]);

    // STRICTLY SEPARATE: Ensure 'tickets' state only contains reports (not social posts)
    const reportsOnly = ticketData.filter(t => t.type !== 'social');

    // Sort tickets
    const sortedTickets = reportsOnly.sort((a, b) => b.createdAt - a.createdAt);

    setTickets(sortedTickets);
    setSocialPosts(postData);
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
  // Stats Calculation
  const stats = {
    total: tickets.length + socialPosts.length,
    active: tickets.filter(t => t.status === 'in_progress' || t.status === 'assigned').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'verified').length,
    posts: socialPosts.length
  };

  // Filter Logic
  const getFilteredContent = () => {
    switch (filter) {
      case 'active':
        // Strict Filter: Status matches AND NOT social
        return tickets.filter(t => (t.status === 'in_progress' || t.status === 'assigned') && t.type !== 'social');
      case 'resolved':
        // Strict Filter: Status matches AND NOT social
        return tickets.filter(t => (t.status === 'resolved' || t.status === 'verified') && t.type !== 'social');
      case 'social':
        return socialPosts;
      default:
        // Recent Activity: Mix both
        return [...tickets, ...socialPosts].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
    }
  };

  const filteredData = getFilteredContent();

  const sectionListRef = React.useRef(null);

  const handleEndReached = () => {
    // Prevent multiple triggers if empty or loading
    if (loading || filteredData.length === 0) return;

    // Pop up message
    setToastVisible(true);

    // Jump to top
    if (sectionListRef.current) {
      sectionListRef.current.scrollToLocation({
        sectionIndex: 0,
        itemIndex: 0,
        viewOffset: 0,
        animated: true
      });
    }
  };

  return (
    <View style={[STYLES.container, Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>

      <SectionList
        ref={sectionListRef}
        sections={[{ title: filter, data: filteredData }]}
        keyExtractor={(item) => item.id}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.1}
        renderItem={({ item }) => (
          <FeedCard ticket={item} />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={[styles.sectionHeader, { backgroundColor: '#f2f2f2' }]}>
            {title === 'all' ? 'Recent Activity' :
              title === 'active' ? 'Active Reports' :
                title === 'resolved' ? 'Resolved Issues' : 'My Posts'}
          </Text>
        )}
        stickySectionHeadersEnabled={true}
        ListHeaderComponent={
          <>
            {/* --- HEADER --- */}
            <View style={styles.header}>
              <View>
                <Text style={styles.welcomeText}>Welcome back, {user?.displayName || 'Citizen'}!</Text>
                <Text style={styles.subText}>Here is your impact overview</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/profile')}>
                {user?.photoURL ? (
                  <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>
                      {(user?.displayName?.trim() || user?.email || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* --- FILTER TABS --- */}
            <View style={styles.statsRow}>
              <TouchableOpacity onPress={() => setFilter('all')} style={[styles.statCard, filter === 'all' && styles.activeCard]}>
                <Text style={[styles.statNumber, filter === 'all' && styles.activeText]}>{stats.total}</Text>
                <Text style={[styles.statLabel, filter === 'all' && styles.activeText]}>Recent</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setFilter('active')} style={[styles.statCard, filter === 'active' && styles.activeCard]}>
                <Text style={[styles.statNumber, { color: COLORS.warning }, filter === 'active' && styles.activeText]}>{stats.active}</Text>
                <Text style={[styles.statLabel, filter === 'active' && styles.activeText]}>Active</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setFilter('resolved')} style={[styles.statCard, filter === 'resolved' && styles.activeCard]}>
                <Text style={[styles.statNumber, { color: COLORS.success }, filter === 'resolved' && styles.activeText]}>{stats.resolved}</Text>
                <Text style={[styles.statLabel, filter === 'resolved' && styles.activeText]}>Resolved</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setFilter('social')} style={[styles.statCard, filter === 'social' && styles.activeCard]}>
                <Text style={[styles.statNumber, { color: COLORS.primary }, filter === 'social' && styles.activeText]}>{stats.posts}</Text>
                <Text style={[styles.statLabel, filter === 'social' && styles.activeText]}>Posts</Text>
              </TouchableOpacity>
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
          </>
        }
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={40} color="#ccc" />
            <Text style={styles.emptyText}>No items found.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }} // padding for tab bar
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

      {/* TOAST NOTIFICATION */}
      <Toast
        visible={toastVisible}
        message="You're all caught up!"
        onHide={() => setToastVisible(false)}
      />

    </View >
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: Platform.OS === 'android' ? 50 : 10,
  },
  welcomeText: { fontSize: 22, fontWeight: 'bold', color: '#202124' },
  subText: { fontSize: 14, color: '#5f6368' },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'white' },
  avatarPlaceholder: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statCard: {
    flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 12, alignItems: 'center', marginHorizontal: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
  },
  activeCard: { backgroundColor: COLORS.primary, borderColor: COLORS.primary, borderWidth: 1 },
  activeText: { color: 'white' },
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