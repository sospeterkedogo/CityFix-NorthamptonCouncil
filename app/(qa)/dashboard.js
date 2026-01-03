import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, Platform, useWindowDimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { TicketService } from '../../src/services/ticketService';
import { UserService } from '../../src/services/userService';
import { COLORS, SPACING, STYLES } from '../../src/constants/theme';
import BeforeAfterViewer from '../../src/components/BeforeAfterViewer';
import MediaGalleryModal from '../../src/components/MediaGalleryModal';
import TutorialOverlay from '../../src/components/TutorialOverlay';
import { Ionicons } from '@expo/vector-icons';


export default function QADashboard() {
  /* State for QA Queue and History */
  const [tickets, setTickets] = useState([]);
  const [historyTickets, setHistoryTickets] = useState([]); // New History State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  // Rejection Handler
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Gallery Logic
  const [galleryUrl, setGalleryUrl] = useState(null);

  // Engineers Logic
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'engineers' | 'history'
  const [engineers, setEngineers] = useState([]);

  useEffect(() => {
    loadQAQueue();
    loadEngineers();
  }, []);

  const loadEngineers = async () => {
    const engs = await UserService.getAllEngineers();
    setEngineers(engs);
  };

  const loadQAQueue = async () => {
    const allData = await TicketService.getAllTickets();
    const allEngineers = await UserService.getAllEngineers(); // Fetch all engineers to map IDs

    // Helper to add engineer name
    const enrichWithEngineer = (list) => {
      return list.map(t => {
        const eng = allEngineers.find(e => e.id === t.assignedTo);
        return { ...t, engineerName: eng ? (eng.name || eng.email) : 'Unknown' };
      });
    };

    // 1. Pending Verification (Status: RESOLVED)
    const pending = allData.filter(t => t.status === 'resolved');
    setTickets(enrichWithEngineer(pending));

    // 2. Verified History (Status: VERIFIED)
    const history = allData.filter(t => t.status === 'verified');
    setHistoryTickets(enrichWithEngineer(history));

    setLoading(false);

    // Clear selection if list refreshed and item gone
    if (selectedTicket && !pending.find(t => t.id === selectedTicket.id) && activeTab === 'queue') {
      setSelectedTicket(null);
    }
  };

  const handleVerify = async () => {
    if (!selectedTicket) return;

    // Log removed
    const res = await TicketService.verifyTicket(selectedTicket.id);

    if (res.success) {
      alert("Ticket Verified!");
      loadQAQueue();
      setSelectedTicket(null);
    } else {
      alert("Error: " + res.error);
    }
  };

  const handleReject = async () => {
    if (!rejectReason) {
      alert("Please provide a reason for rejection.");
      return;
    }

    const res = await TicketService.reopenTicket(selectedTicket.id, rejectReason);

    if (res.success) {
      alert("Ticket Reopened. Sent back to Dispatcher.");
      loadQAQueue();
    }
  };

  // --- RENDER HELPERS ---

  const TicketRow = ({ item }) => (
    <TouchableOpacity
      style={[styles.row, selectedTicket?.id === item.id && styles.rowActive]}
      onPress={() => { setSelectedTicket(item); setShowRejectInput(false); }}
    >
      <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowSub}>Resolved by: {item.engineerName}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#ccc" />
    </TouchableOpacity>
  );

  const EngineerRow = ({ item }) => {
    const getStatusColor = (status) => {
      if (status === 'Available') return COLORS.success;
      if (status === 'Busy' || status === 'Holiday') return COLORS.error;
      return '#666'; // Default/Offline
    };

    const color = getStatusColor(item.status);

    return (
      <View style={styles.row}>
        <View style={[styles.avatarCircle, { width: 32, height: 32, marginRight: 10, backgroundColor: COLORS.secondary }]}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>{item.email?.charAt(0).toUpperCase() || 'E'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{item.name || item.email || "Engineer"}</Text>
          <Text style={styles.rowSub}>{item.email}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 6 }} />
          <Text style={{ fontSize: 12, color: color }}>{item.status || 'Available'}</Text>
        </View>
      </View>
    );
  };

  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

  return (
    <View style={styles.container}>
      <TutorialOverlay role="qa" page="dashboard" />

      {/* HEADER */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerTitle}>Quality Assurance</Text>
          <Text style={styles.headerSub}>
            {activeTab === 'queue' ? `${tickets.length} jobs pending verification` :
              activeTab === 'history' ? `${historyTickets.length} previously verified jobs` :
                `${engineers.length} active engineers`}
          </Text>
        </View>

        {/* Profile / Logout Button */}
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push('/profile')}
        >
          <View style={styles.avatarCircle}>
            {user?.email ? (
              <Text style={styles.avatarText}>{(user?.displayName || user.email).charAt(0).toUpperCase()}</Text>
            ) : (
              <Ionicons name="person-outline" size={20} color="white" />
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* TABS */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'queue' && styles.activeTab]}
          onPress={() => { setActiveTab('queue'); setSelectedTicket(null); }}
        >
          <Text style={[styles.tabText, activeTab === 'queue' && styles.activeTabText]}>Verification Queue</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'engineers' && styles.activeTab]}
          onPress={() => setActiveTab('engineers')}
        >
          <Text style={[styles.tabText, activeTab === 'engineers' && styles.activeTabText]}>Engineer List</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => { setActiveTab('history'); setSelectedTicket(null); }}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>Verified History</Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT AREA */}
      {activeTab === 'queue' || activeTab === 'history' ? (
        <View style={styles.splitView}>
          {/* LEFT: LIST */}
          {(!isMobile || (isMobile && !selectedTicket)) && (
            <View style={[styles.listColumn, isMobile && { flex: 1 }]}>
              <FlatList
                data={activeTab === 'history' ? historyTickets : tickets}
                renderItem={({ item }) => <TicketRow item={item} />}
                keyExtractor={(item, index) => item.id || String(index)}
                ListEmptyComponent={<Text style={{ padding: 20, color: '#999' }}>
                  {activeTab === 'history' ? "No history found." : "Queue is empty. Good job!"}
                </Text>}
              />
            </View>
          )}

          {/* RIGHT: COMPARISON */}
          {(!isMobile || (isMobile && selectedTicket)) && (
            <View style={[styles.detailColumn, isMobile && { flex: 1 }]}>
              {isMobile && selectedTicket && (
                <TouchableOpacity
                  style={{ marginBottom: 10, padding: 10, backgroundColor: '#eee', borderRadius: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => setSelectedTicket(null)}
                >
                  <Ionicons name="arrow-back" size={20} color="black" style={{ marginRight: 5 }} />
                  <Text style={{ fontWeight: 'bold' }}>Back to List</Text>
                </TouchableOpacity>
              )}

              {selectedTicket ? (
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailTitle}>{selectedTicket.title}</Text>

                  <Text style={styles.sectionHeader}>Visual Verification</Text>

                  {/* THE CORE COMPONENT */}
                  <BeforeAfterViewer
                    beforeMedia={selectedTicket.photos}
                    afterMedia={selectedTicket.afterPhoto}
                    onOpenMedia={(url) => setGalleryUrl(url)}
                  />

                  <Text style={styles.sectionHeader}>Engineer's Notes</Text>
                  <View style={styles.noteBox}>
                    <Text style={styles.noteText}>{selectedTicket.resolutionNotes || "No notes provided."}</Text>
                  </View>

                  {/* DECISION AREA - HIDE IF HISTORY */}
                  {activeTab === 'queue' && (
                    <View style={styles.decisionArea}>
                      {!showRejectInput ? (
                        <>
                          <TouchableOpacity style={styles.rejectBtn} onPress={() => setShowRejectInput(true)}>
                            <Ionicons name="close-circle-outline" size={18} color="white" style={{ marginRight: 5 }} />
                            <Text style={styles.rejectText}>REJECT / REOPEN</Text>
                          </TouchableOpacity>

                          <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify}>
                            <Ionicons name="checkmark-circle-outline" size={20} color="white" style={{ marginRight: 5 }} />
                            <Text style={styles.verifyText}>VERIFY FIX</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <View style={styles.rejectForm}>
                          <Text style={styles.rejectLabel}>Reason for Rejection:</Text>
                          <TextInput
                            style={styles.rejectInput}
                            placeholder="e.g. Worksite not cleaned up..."
                            value={rejectReason}
                            onChangeText={setRejectReason}
                          />
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                              style={[styles.rejectBtn, { flex: 1 }]}
                              onPress={handleReject}
                            >
                              <Text style={styles.rejectText}>CONFIRM REJECTION</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.cancelBtn}
                              onPress={() => setShowRejectInput(false)}
                            >
                              <Text style={{ color: '#666' }}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                  {activeTab === 'history' && (
                    <View style={[styles.decisionArea, { justifyContent: 'center' }]}>
                      <Text style={{ color: COLORS.success, fontWeight: 'bold' }}>
                        <Ionicons name="checkmark-circle" size={18} /> Verified & Closed
                      </Text>
                    </View>
                  )}

                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={48} color="#ccc" style={{ marginBottom: 10 }} />
                  <Text style={styles.emptyText}>Select a job to view details</Text>
                </View>
              )}
            </View>
          )}
        </View>
      ) : (
        /* ENGINEER LIST VIEW */
        <View style={[styles.listColumn, { flex: 1 }]}>
          <FlatList
            data={engineers}
            renderItem={({ item }) => <EngineerRow item={item} />}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={{ padding: 20, color: '#999' }}>No engineers found.</Text>}
          />
        </View>
      )}

      {/* FULL SCREEN MODAL FOR ZOOM */}
      <MediaGalleryModal
        visible={!!galleryUrl}
        onClose={() => setGalleryUrl(null)}
        mediaUrls={galleryUrl ? [galleryUrl] : []}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 20 },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  headerSub: { color: COLORS.text.secondary },

  profileBtn: {
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    ...STYLES.shadow
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18
  },
  profileText: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  splitView: { flex: 1, flexDirection: 'row', gap: 20 },

  listColumn: { flex: 0.3, backgroundColor: 'white', borderRadius: 12, ...STYLES.shadow },
  detailColumn: { flex: 0.7, backgroundColor: 'white', borderRadius: 12, padding: 20, ...STYLES.shadow },

  row: { padding: 15, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', alignItems: 'center' },
  rowActive: { backgroundColor: '#eef2f7', borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  rowTitle: { fontWeight: 'bold', color: COLORS.primary },
  rowSub: { fontSize: 11, color: '#999' },

  detailTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary, marginBottom: 20 },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 10, marginTop: 10, textTransform: 'uppercase' },

  noteBox: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  noteText: { color: '#333', fontStyle: 'italic' },

  decisionArea: { marginTop: 40, borderTopWidth: 1, borderColor: '#eee', paddingTop: 20, flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },

  verifyBtn: { backgroundColor: COLORS.success, paddingVertical: 15, paddingHorizontal: 30, borderRadius: 8, ...STYLES.shadow, flexDirection: 'row', alignItems: 'center' },
  verifyText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  rejectBtn: { backgroundColor: COLORS.error, paddingVertical: 15, paddingHorizontal: 20, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rejectText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  rejectForm: { flex: 1 },
  rejectLabel: { fontWeight: 'bold', marginBottom: 5, color: COLORS.error },
  rejectInput: { borderWidth: 1, borderColor: COLORS.error, borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: '#fff0f0' },
  cancelBtn: { justifyContent: 'center', paddingHorizontal: 15 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#ccc', fontSize: 20 },
  tabContainer: { flexDirection: 'row', marginBottom: 20, backgroundColor: 'white', borderRadius: 8, padding: 5, ...STYLES.shadow },
  tab: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { fontWeight: '600', color: '#666' },
  activeTabText: { color: 'white' },
});