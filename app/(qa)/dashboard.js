import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { TicketService } from '../../src/services/ticketService';
import { COLORS, SPACING, STYLES } from '../../src/constants/theme';
import BeforeAfterViewer from '../../src/components/BeforeAfterViewer';
import MediaGalleryModal from '../../src/components/MediaGalleryModal';


export default function QADashboard() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  // Rejection Logic
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Gallery Logic
  const [galleryUrl, setGalleryUrl] = useState(null);

  useEffect(() => {
    loadQAQueue();
  }, []);

  const loadQAQueue = async () => {
    // In a real app, use a query where("status", "==", "resolved")
    const allData = await TicketService.getAllTickets();
    const resolvedOnly = allData.filter(t => t.status === 'resolved');
    setTickets(resolvedOnly);
    setLoading(false);

    // Clear selection if list refreshed
    if (selectedTicket && !resolvedOnly.find(t => t.id === selectedTicket.id)) {
      setSelectedTicket(null);
    }
  };

  const handleVerify = async () => {
    if (!selectedTicket) {
      console.log("❌ No ticket selected");
      return;
    }

    console.log("🖱️ Verify button clicked");

    // --- WEB LOGIC ---
    if (Platform.OS === 'web') {
      const confirmed = window.confirm("Are you sure this fix meets quality standards?");
      if (confirmed) {
        console.log("✅ Confirmed. Calling Service...");
        const res = await TicketService.verifyTicket(selectedTicket.id);

        if (res.success) {
          alert("Ticket Verified!"); // Simple web alert
          loadQAQueue();
          setSelectedTicket(null); // Clear selection
        } else {
          alert("Error: " + res.error);
        }
      }
      return;
    }

    // --- MOBILE LOGIC ---
    Alert.alert("Confirm Verification", "Are you sure this fix meets quality standards?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, Verify",
        onPress: async () => {
          const res = await TicketService.verifyTicket(selectedTicket.id);
          if (res.success) {
            loadQAQueue();
            setSelectedTicket(null);
          } else {
            Alert.alert("Error", res.error);
          }
        }
      }
    ]);
  };

  const handleReject = async () => {
    if (!rejectReason) {
      alert("Please provide a reason for rejection.");
      return;
    }

    const res = await TicketService.reopenTicket(selectedTicket.id, rejectReason);

    if (res.success) {
      alert("Ticket Reopened. Sent back to Dispatcher.");
      loadQAQueue(); // Refresh list (item will disappear)
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
        <Text style={styles.rowSub}>Resolved by Eng. #{item.assignedTo}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerTitle}>Quality Assurance</Text>
          <Text style={styles.headerSub}>{tickets.length} jobs pending verification</Text>
        </View>

        {/* NEW: Profile / Logout Button */}
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push('/profile')}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{user?.email?.charAt(0).toUpperCase() || 'Q'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.splitView}>

        {/* LEFT: LIST */}
        <View style={styles.listColumn}>
          <FlatList
            data={tickets}
            renderItem={({ item }) => <TicketRow item={item} />}
            keyExtractor={(item, index) => item.id || String(index)}
            ListEmptyComponent={<Text style={{ padding: 20, color: '#999' }}>Queue is empty. Good job!</Text>}
          />
        </View>

        {/* RIGHT: COMPARISON */}
        <View style={styles.detailColumn}>
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

              {/* DECISION AREA */}
              <View style={styles.decisionArea}>
                {!showRejectInput ? (
                  <>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => setShowRejectInput(true)}>
                      <Text style={styles.rejectText}>✕ REJECT / REOPEN</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify}>
                      <Text style={styles.verifyText}>✓ VERIFY FIX</Text>
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

            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Select a job to verify</Text>
            </View>
          )}
        </View>
      </View>

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
    // Removed border/background logic for pure avatar
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
  chevron: { marginLeft: 'auto', color: '#ccc', fontSize: 18 },

  detailTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary, marginBottom: 20 },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 10, marginTop: 10, textTransform: 'uppercase' },

  noteBox: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  noteText: { color: '#333', fontStyle: 'italic' },

  decisionArea: { marginTop: 40, borderTopWidth: 1, borderColor: '#eee', paddingTop: 20, flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },

  verifyBtn: { backgroundColor: COLORS.success, paddingVertical: 15, paddingHorizontal: 30, borderRadius: 8, ...STYLES.shadow },
  verifyText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  rejectBtn: { backgroundColor: COLORS.error, paddingVertical: 15, paddingHorizontal: 20, borderRadius: 8 },
  rejectText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  rejectForm: { flex: 1 },
  rejectLabel: { fontWeight: 'bold', marginBottom: 5, color: COLORS.error },
  rejectInput: { borderWidth: 1, borderColor: COLORS.error, borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: '#fff0f0' },
  cancelBtn: { justifyContent: 'center', paddingHorizontal: 15 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#ccc', fontSize: 20 },
});