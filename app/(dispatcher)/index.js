import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Linking, ScrollView, Platform, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { TicketService } from '../../src/services/ticketService';
import { COLORS, SPACING, STYLES } from '../../src/constants/theme';
import MediaGalleryModal from '../../src/components/MediaGalleryModal';
import AssignEngineerModal from '../../src/components/AssignEngineerModal';
import { canAssign } from '../../src/constants/workflow';
import { getSLAStatus } from '../../src/utils/sla';
import { getDistanceKm } from '../../src/utils/geo';

export default function DispatcherInbox() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [galleryItems, setGalleryItems] = useState([]);

  const DUPLICATE_THRESHOLD_KM = 0.02; // 20 meters

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to log out?")) {
        await logout();
        router.replace('/(auth)/login');
      }
    } else {
      Alert.alert("Log Out", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          }
        }
      ]);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    const data = await TicketService.getAllTickets();
    // Sort: Submitted first, then by date
    const sorted = data.sort((a, b) => b.createdAt - a.createdAt);
    setTickets(sorted);
    setLoading(false);
  };

  // Helper to check video type
  const isVideo = (url) => url.includes('.mp4') || url.includes('.mov');

  // 1. Open Citizen Evidence
  const openCitizenGallery = (index) => {
    setGalleryItems(selectedTicket.photos || []);
    setGalleryIndex(index);
    setGalleryVisible(true);
  };

  // 2. Open Engineer Proof
  const openProofGallery = () => {
    if (selectedTicket.afterPhoto) {
      setGalleryItems([selectedTicket.afterPhoto]); // Show only the proof
      setGalleryIndex(0);
      setGalleryVisible(true);
    }
  };

  // Helper: Open Google Maps for the Dispatcher
  const openExternalMap = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url);
  };

  // --- COMPONENT: List Item ---
  const TicketRow = ({ item }) => {
    // 1. Calculate SLA / Check Resolved Status PER ITEM
    const isResolved = item.status === 'resolved' || item.status === 'verified';
    const sla = getSLAStatus(item.createdAt);

    // Resolve Date: Use resolvedAt, or verifiedAt, or fallback to updatedAt
    const resolvedDate = item.resolvedAt || item.verifiedAt || item.updatedAt;

    return (
      <TouchableOpacity
        style={[
          styles.row,
          selectedTicket?.id === item.id && styles.rowActive
        ]}
        onPress={() => setSelectedTicket(item)}
      >
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{item.title}</Text>

          {/* SLA / RESOLVED BADGE */}
          {isResolved ? (
            <View style={{
              backgroundColor: '#27AE60', // Green
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              marginTop: 4,
              alignSelf: 'flex-start'
            }}>
              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                RESOLVED {resolvedDate ? new Date(resolvedDate).toLocaleDateString() : ''}
              </Text>
            </View>
          ) : (
            <View style={{
              backgroundColor: sla.color,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              marginTop: 4,
              alignSelf: 'flex-start'
            }}>
              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                {sla.text}
              </Text>
            </View>
          )}

          <Text style={styles.rowSub}>
            {item.category.toUpperCase()} • {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  // Called when an engineer is clicked in the modal
  const handleAssignTicket = async (engineerId) => {
    if (!selectedTicket) return;

    const result = await TicketService.assignTicket(selectedTicket.id, engineerId);

    if (result.success) {
      // Refresh the list to show the new status
      await loadTickets();

      // Update the selected ticket view immediately so the badge changes color
      setSelectedTicket(prev => ({
        ...prev,
        status: 'assigned',
        assignedTo: engineerId
      }));
    } else {
      alert("Failed to assign ticket: " + result.error);
    }
  };

  // --- COMPONENT: Right Detail Panel ---
  const DetailPanel = () => {
    if (!selectedTicket) return (
      <View style={styles.emptyDetail}>
        <Text style={styles.emptyText}>Select a ticket to view details</Text>
      </View>
    );

    const potentialDuplicates = tickets.filter(t =>
      t.id !== selectedTicket.id &&
      t.status !== 'resolved' &&
      getDistanceKm(
        selectedTicket.location.latitude, selectedTicket.location.longitude,
        t.location.latitude, t.location.longitude
      ) < DUPLICATE_THRESHOLD_KM
    );

    const handleMergeDuplicates = async (duplicates) => {
      if (!selectedTicket) return;

      const duplicateIds = duplicates.map(d => d.id);

      // UI Feedback
      if (Platform.OS === 'web') {
        const confirm = window.confirm(`Merge ${duplicateIds.length} tickets into this one?`);
        if (!confirm) return;
      }

      const result = await TicketService.mergeTickets(selectedTicket.id, duplicateIds);

      if (result.success) {
        alert("Tickets merged successfully.");
        loadTickets(); // Refresh to remove the merged tickets from the list
      } else {
        alert("Error merging: " + result.error);
      }
    };

    const isAssignable = selectedTicket ? canAssign(selectedTicket.status) : false;

    return (
      <ScrollView style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>{selectedTicket.title}</Text>
          <View style={[styles.badge, { backgroundColor: getStatusColor(selectedTicket.status) }]}>
            <Text style={styles.badgeText}>{selectedTicket.status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.description}>{selectedTicket.description}</Text>

        {/* DUPLICATE WARNING BANNER */}
        {
          potentialDuplicates.length > 0 && (
            <View style={styles.duplicateBanner}>
              <Text style={styles.duplicateTitle}>⚠️ Potential Duplicates Detected</Text>
              <Text style={styles.duplicateSub}>
                The following reports are within 20m of this location:
              </Text>

              {potentialDuplicates.map(dup => (
                <TouchableOpacity
                  key={dup.id}
                  style={styles.duplicateRow}
                  onPress={() => setSelectedTicket(dup)} // Quick jump
                >
                  <Text style={{ fontWeight: 'bold' }}>#{dup.id.slice(0, 4)}: {dup.title}</Text>
                  <Text style={{ fontSize: 10 }}>
                    {(getDistanceKm(selectedTicket.location.latitude, selectedTicket.location.longitude, dup.location.latitude, dup.location.longitude) * 1000).toFixed(0)}m away
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={styles.mergeBtn} onPress={() => handleMergeDuplicates(potentialDuplicates)}>
                <Text style={{ color: COLORS.action, fontWeight: 'bold' }}>Merge All Duplicates</Text>
              </TouchableOpacity>
            </View>
          )
        }

        {/* Action Bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openExternalMap(selectedTicket.location.latitude, selectedTicket.location.longitude)}
          >
            <Text style={styles.btnText}>📍 Open in Maps</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: isAssignable ? COLORS.action : '#ccc' } // Grey if blocked
            ]}
            disabled={!isAssignable} // Physically disable clicks
            onPress={() => setAssignModalVisible(true)}
          >
            <Text style={styles.btnText}>
              {selectedTicket?.status === 'assigned' ? '🔄 Change Engineer' : (isAssignable ? '👷 Assign Engineer' : '🔒 Locked')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* --- SECTION 1: CITIZEN EVIDENCE --- */}
        <Text style={styles.sectionHeader}>Citizen Evidence</Text>
        <View style={styles.photoGrid}>
          {selectedTicket.photos && selectedTicket.photos.map((url, index) => {
            const isVid = isVideo(url);
            return (
              <TouchableOpacity key={index} onPress={() => openCitizenGallery(index)}>
                {isVid ? (
                  <View style={[styles.evidencePhoto, styles.videoPlaceholder]}>
                    <Text style={{ fontSize: 20 }}>🎥</Text>
                  </View>
                ) : (
                  <Image source={{ uri: url }} style={styles.evidencePhoto} />
                )}
              </TouchableOpacity>
            );
          })}
          {(!selectedTicket.photos || selectedTicket.photos.length === 0) && (
            <Text style={{ color: '#999' }}>No evidence provided.</Text>
          )}
        </View>

        {/* --- SECTION 2: RESOLUTION PROOF (NEW) --- */}
        {/* Only show this if the ticket has been resolved */}
        {
          (selectedTicket.status === 'resolved' || selectedTicket.status === 'verified') && selectedTicket.afterPhoto && (
            <View style={styles.resolutionSection}>
              <Text style={[styles.sectionHeader, { color: COLORS.success }]}>
                Resolution Proof (Engineer)
              </Text>

              <TouchableOpacity onPress={openProofGallery}>
                {isVideo(selectedTicket.afterPhoto) ? (
                  <View style={[styles.evidencePhoto, styles.videoPlaceholder, styles.proofBorder]}>
                    <Text style={{ fontSize: 24 }}>✅</Text>
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>PLAY PROOF</Text>
                  </View>
                ) : (
                  <Image
                    source={{ uri: selectedTicket.afterPhoto }}
                    style={[styles.evidencePhoto, styles.proofBorder]}
                  />
                )}
              </TouchableOpacity>

              {/* Engineer Notes */}
              <View style={styles.noteBox}>
                <Text style={styles.noteLabel}>Engineer's Note:</Text>
                <Text style={styles.noteText}>
                  {selectedTicket.resolutionNotes || "No notes provided."}
                </Text>
              </View>
            </View>
          )
        }

        <View style={{ height: 50 }} />
      </ScrollView >
    );
  };

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

  return (
    <View style={STYLES.container}>
      {/* HEADER */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerTitle}>Dispatcher Console</Text>
          <Text style={styles.headerSub}>Manage and assign tickets</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{user?.email?.charAt(0).toUpperCase() || 'D'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.splitView}>
        {/* LEFT: List */}
        <View style={styles.listColumn}>
          <Text style={styles.columnHeader}>Incoming Reports ({tickets.length})</Text>
          <FlatList
            data={tickets}
            renderItem={({ item }) => <TicketRow item={item} />}
            keyExtractor={(item, index) => item.id || String(index)}
          />
        </View>

        {/* RIGHT: Details */}
        <View style={styles.detailColumn}>
          <DetailPanel />
        </View>

        {/* --- THE GALLERY MODAL --- */}
        {selectedTicket && (
          <MediaGalleryModal
            visible={galleryVisible}
            onClose={() => setGalleryVisible(false)}
            mediaUrls={galleryItems}
            initialIndex={galleryIndex}
          />
        )}

        {/* ASSIGN ENGINEER MODAL */}
        <AssignEngineerModal
          visible={assignModalVisible}
          onClose={() => setAssignModalVisible(false)}
          onAssign={handleAssignTicket}
        />
      </View>
    </View>
  );
}

// Helpers
const getStatusColor = (status) => {
  if (status === 'resolved') return COLORS.pending;
  if (status === 'assigned') return COLORS.action;
  if (status === 'in_progress') return COLORS.warning;
  if (status === 'reopened') return COLORS.error;
  if (status === 'verified') return COLORS.success;
  return COLORS.error; // Draft/Submitted
};

const styles = StyleSheet.create({
  splitView: { flex: 1, flexDirection: 'row', gap: 20 },

  // Left Column
  listColumn: { flex: 0.4, backgroundColor: 'white', borderRadius: 12, padding: 10, ...STYLES.shadow },
  columnHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginLeft: 10, color: COLORS.primary },
  row: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  rowActive: { backgroundColor: '#eef2f7' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  rowTitle: { fontWeight: '600', color: COLORS.primary },
  rowSub: { fontSize: 12, color: '#999', marginTop: 2 },
  chevron: { color: '#ccc', fontSize: 20 },

  // Right Column
  detailColumn: { flex: 0.6, backgroundColor: 'white', borderRadius: 12, padding: 20, ...STYLES.shadow },
  emptyDetail: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#ccc', fontSize: 18 },

  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  detailTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  description: { fontSize: 16, color: '#555', lineHeight: 24, marginBottom: 20 },

  actionBar: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionBtn: { backgroundColor: COLORS.primary, padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '600' },

  sectionHeader: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
  photoGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  evidencePhoto: { width: 100, height: 100, borderRadius: 8, backgroundColor: '#eee' },
  mediaWrapper: {
    position: 'relative',
    ...STYLES.shadow,
  },
  evidencePhoto: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#eee'
  },
  videoPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  videoLabel: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10,
    marginTop: 4,

  },
  resolutionSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#f0f0f0',
  },
  proofBorder: {
    borderWidth: 3,
    borderColor: COLORS.success, // Green border to highlight it's the fix
    width: 150, // Make proof slightly bigger
    height: 150,
  },
  noteBox: {
    marginTop: 10,
    backgroundColor: '#F0F9F4', // Light green background
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  noteLabel: {
    fontWeight: 'bold',
    color: COLORS.success,
    fontSize: 12,
    marginBottom: 4,
  },
  noteText: {
    color: '#333',
    fontStyle: 'italic',
  },
  duplicateBanner: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeeba',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  duplicateTitle: { color: '#856404', fontWeight: 'bold', marginBottom: 5 },
  duplicateSub: { fontSize: 12, color: '#856404', marginBottom: 10 },
  duplicateRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: 8, backgroundColor: 'rgba(255,255,255,0.5)',
    marginBottom: 5, borderRadius: 4
  },
  mergeBtn: { marginTop: 10, alignItems: 'center' },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#faa', borderRadius: 20 },
  logoutText: { color: '#c00', fontWeight: 'bold', fontSize: 12 },
});