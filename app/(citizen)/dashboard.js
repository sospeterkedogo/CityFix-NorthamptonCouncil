import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, SectionList, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator, Modal, Platform, Image, TextInput, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { useClientSearch } from '../../src/hooks/useClientSearch';
import SearchBar from '../../src/components/SearchBar';
import GetAppModal from '../../src/components/GetTheApp';

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [socialPosts, setSocialPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [showGetAppModal, setShowGetAppModal] = useState(false);

  // Hook for search
  const allItems = React.useMemo(() =>
    [...tickets, ...socialPosts].sort((a, b) => b.createdAt - a.createdAt),
    [tickets, socialPosts]
  );

  const { searchQuery, setSearchQuery, filteredData, performManualSearch } = useClientSearch(allItems, [
    'title', 'description', 'category', 'userName', 'locationName'
  ]);

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

  // Date Grouping Logic
  const groupItemsByDate = (items) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const grouped = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'Earlier': []
    };

    items.forEach(item => {
      const date = new Date(item.createdAt);

      if (date.toDateString() === today.toDateString()) {
        grouped['Today'].push(item);
      } else if (date.toDateString() === yesterday.toDateString()) {
        grouped['Yesterday'].push(item);
      } else {
        const diffTime = Math.abs(today - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          grouped['This Week'].push(item);
        } else {
          grouped['Earlier'].push(item);
        }
      }
    });

    // Create SectionList structure
    const sections = [];
    if (grouped['Today'].length > 0) sections.push({ title: 'Today', data: grouped['Today'] });
    if (grouped['Yesterday'].length > 0) sections.push({ title: 'Yesterday', data: grouped['Yesterday'] });
    if (grouped['This Week'].length > 0) sections.push({ title: 'This Week', data: grouped['This Week'] });
    if (grouped['Earlier'].length > 0) sections.push({ title: 'Earlier', data: grouped['Earlier'] });

    return sections;
  };

  const sections = groupItemsByDate(filteredData);

  const sectionListRef = React.useRef(null);

  const handleEndReached = () => {
    // Prevent multiple triggers if empty or loading
    if (loading || sections.length === 0) return;
    if (searchQuery.trim() && filteredData.length === 0) return; // Don't toast on empty search
    setToastVisible(true);
  };

  return (
    <SafeAreaView style={[STYLES.container, Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>

      <SectionList
        ref={sectionListRef}
        sections={sections}
        keyExtractor={(item) => item.id}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.1}
        renderItem={({ item }) => (
          <SimpleExpandableRow ticket={item} />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeaderBox}>
            <Text style={styles.sectionHeaderTitle}>{title}</Text>
          </View>
        )}
        stickySectionHeadersEnabled={false} // Cleaner notification look
        ListHeaderComponent={
          <>
            {/* --- HEADER --- */}
            <View style={styles.header}>
              <View>
                <Text style={styles.welcomeText}>Welcome back, {user?.displayName || 'Citizen'}!</Text>
                <Text style={styles.subText}>Recent updates from your community</Text>
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

            {/* --- SEARCH BAR --- */}
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSearch={performManualSearch}
              placeholder="Search updates..."
            />

            {/* --- MOBILE APP BANNER (Web Only) --- */}
            {Platform.OS === 'web' && (
              <View style={styles.webBanner}>
                <View style={{ flex: 1 }}>
                  <TouchableOpacity onPress={() => setShowGetAppModal(true)}>
                    <Text style={styles.bannerLink}>Try our Android App</Text>
                  </TouchableOpacity>

                  <Text style={styles.bannerInfo}>iOS version coming soon</Text>
                </View>
                <TouchableOpacity onPress={() => setShowGetAppModal(true)} style={styles.bannerBtn}>
                  <Ionicons name="arrow-forward" size={16} color="white" />
                </TouchableOpacity>
              </View>
            )}

            {/* --- STATS SUMMARY (Optional - kept for context but simplified) --- */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.total}</Text>
                <Text style={styles.statLabel}>Updates</Text>
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
          </>
        }
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={40} color="#ccc" />
            <Text style={styles.emptyText}>No recent activity.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }} // padding for tab bar
      />

      {/* Drafts Modal */}
      <Modal visible={showDraftsModal} animationType="slide" transparent={true} onRequestClose={() => setShowDraftsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, Platform.OS === 'web' && { maxWidth: 500, width: '100%', alignSelf: 'center' }]}>
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={styles.modalTitle}>Select Draft</Text>
              <TouchableOpacity onPress={() => setShowDraftsModal(false)} style={{ padding: 5 }}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

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
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.draftItemTitle} numberOfLines={1}>{item.title || "Untitled Report"}</Text>
                      <Text style={styles.draftItemDate}>{new Date(item.updatedAt).toLocaleString()}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#999', marginVertical: 20 }}>No drafts found.</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* TOAST NOTIFICATION */}
      <Toast
        visible={toastVisible}
        message="You're all caught up!"
        onHide={() => setToastVisible(false)}
      />

      {/* WEB: Get App Modal */}
      <GetAppModal
        visible={showGetAppModal}
        onClose={() => setShowGetAppModal(false)}
        userEmail={user?.email}
      />

    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    // marginTop handled by SafeAreaView
  },
  welcomeText: { fontSize: 22, fontWeight: 'bold', color: '#202124' },
  subText: { fontSize: 14, color: '#5f6368' },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'white' },
  avatarPlaceholder: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  // Web Banner
  webBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f1f5f9', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 10,
    marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0'
  },
  bannerLink: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary, marginBottom: 2 },
  bannerInfo: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  bannerBtn: { backgroundColor: COLORS.primary, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

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
  sectionHeaderBox: {
    paddingVertical: 15,
    paddingHorizontal: 0,
    backgroundColor: '#F2F6F9',
    marginTop: 10,
    marginBottom: 5,
    borderRadius: 8
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginLeft: 10
  },

  // kept SimpleRow styles if used elsewhere, otherwise they are replaced by SimpleExpandableRow
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