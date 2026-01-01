import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Linking, ScrollView, Platform, Alert, useWindowDimensions
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
import { Ionicons } from '@expo/vector-icons';
import TutorialOverlay from '../../src/components/TutorialOverlay';

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
  const [filter, setFilter] = useState('active'); // 'active' | 'resolved'

  const DUPLICATE_THRESHOLD_KM = 0.02; // 20 meters

  const filteredTickets = tickets.filter(t => {
    const status = t.status?.toLowerCase() || '';
    const isResolvedOrVerified = status === 'resolved' || status === 'verified';

    if (filter === 'resolved') return isResolvedOrVerified;
    return !isResolvedOrVerified;
  });

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

  const isVideo = (url) => url.includes('.mp4') || url.includes('.mov');

  // Open Citizen Evidence Gallery
  const openCitizenGallery = (index) => {
    setGalleryItems(selectedTicket.photos || []);
    setGalleryIndex(index);
    setGalleryVisible(true);
  };

  // Open Engineer Proof Gallery
  const openProofGallery = () => {
    if (selectedTicket.afterPhoto) {
      setGalleryItems([selectedTicket.afterPhoto]);
      setGalleryIndex(0);
      setGalleryVisible(true);
    }
  };

  const openExternalMap = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url);
  };

  const TicketRow = ({ item }) => {
    const isResolved = item.status === 'resolved' || item.status === 'verified';
    const sla = getSLAStatus(item.createdAt);
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
            <View style={[styles.badgeContainer, { backgroundColor: '#27AE60' }]}>
              <Text style={styles.badgeText}>
                RESOLVED {resolvedDate ? new Date(resolvedDate).toLocaleDateString() : ''}
              </Text>
            </View>
          ) : (
            <View style={[styles.badgeContainer, { backgroundColor: sla.color }]}>
              <Text style={styles.badgeText}>{sla.text}</Text>
            </View>
          )}

          <Text style={styles.rowSub}>
            {(item.category || 'General').toUpperCase()} • {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>
    );
  };

  const handleAssignTicket = async (engineer) => {
    if (!selectedTicket) return;

    const result = await TicketService.assignTicket(selectedTicket.id, engineer.id);

    if (result.success) {
      await loadTickets();
      setSelectedTicket(prev => ({
        ...prev,
        status: 'assigned',
        assignedTo: engineer.id
      }));

      if (Platform.OS === 'web') {
        window.alert(`Success: Ticket assigned to ${engineer.name}`);
      } else {
        Alert.alert("Assignment Complete", `Ticket assigned to ${engineer.name}`);
      }
    } else {
      alert("Failed to assign ticket: " + result.error);
    }
  };

  const handleAutoAssign = async () => {
    if (!selectedTicket) return;
    const confirm = Platform.OS === 'web' ? window.confirm("Auto-assign this ticket to the nearest available engineer?") : true;
    if (!confirm) return;

    const result = await TicketService.autoAssign(selectedTicket.id);
    if (result.success) {
      alert("Ticket auto-assigned successfully!");
      loadTickets();
      // Optimistically update
      setSelectedTicket(prev => ({ ...prev, status: 'assigned' }));
    } else {
      alert("Auto-assign failed: " + result.error);
    }
  };

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

      if (Platform.OS === 'web') {
        const confirm = window.confirm(`Merge ${duplicateIds.length} tickets into this one?`);
        if (!confirm) return;
      }

      const result = await TicketService.mergeTickets(selectedTicket.id, duplicateIds);

      if (result.success) {
        alert("Tickets merged successfully.");
        loadTickets();
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
            <Text style={styles.statusBadgeText}>{selectedTicket.status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.description}>{selectedTicket.description}</Text>

        {/* Duplicate Warning Banner */}
        {potentialDuplicates.length > 0 && (
          <View style={styles.duplicateBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
              <Ionicons name="warning-outline" size={20} color="#856404" style={{ marginRight: 5 }} />
              <Text style={styles.duplicateTitle}>Potential Duplicates Detected</Text>
            </View>
            <Text style={styles.duplicateSub}>
              The following reports are within 20m of this location:
            </Text>

            {potentialDuplicates.map(dup => (
              <TouchableOpacity
                key={dup.id}
                style={styles.duplicateRow}
                onPress={() => setSelectedTicket(dup)}
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
            <Ionicons name="map-outline" size={18} color="white" style={{ marginRight: 5 }} />
            <Text style={styles.btnText}>Open in Maps</Text>
          </TouchableOpacity>

          {/* New: Mark Under Review */}
          {selectedTicket.status === 'submitted' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#8e44ad' }]} // Purple for Review
              onPress={async () => {
                const res = await TicketService.markAsUnderReview(selectedTicket.id);
                if (res.success) {
                  alert("Ticket marked as Under Review");
                  loadTickets();
                  setSelectedTicket(prev => ({ ...prev, status: 'under_review' }));
                }
              }}
            >
              <Ionicons name="eye-outline" size={18} color="white" style={{ marginRight: 5 }} />
              <Text style={styles.btnText}>Review</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: isAssignable ? COLORS.action : '#ccc' }
            ]}
            disabled={!isAssignable}
            onPress={() => setAssignModalVisible(true)}
          >
            <Ionicons
              name={selectedTicket?.status === 'assigned' ? "refresh-outline" : (isAssignable ? "person-add-outline" : "lock-closed-outline")}
              size={18}
              color="white"
              style={{ marginRight: 5 }}
            />
            <Text style={styles.btnText}>
              {selectedTicket?.status === 'assigned' ? 'Change Engineer' : (isAssignable ? 'Assign Engineer' : 'Locked')}
            </Text>
          </TouchableOpacity>

          {/* Auto Assign Button */}
          {isAssignable && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#FF8C00' }]} // Dark Orange
              onPress={handleAutoAssign}
            >
              <Ionicons name="flash-outline" size={18} color="white" style={{ marginRight: 5 }} />
              <Text style={styles.btnText}>Auto Assign</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Section: Citizen Evidence */}
        <Text style={styles.sectionHeader}>Citizen Evidence</Text>
        <View style={styles.photoGrid}>
          {selectedTicket.photos && selectedTicket.photos.map((url, index) => {
            const isVid = isVideo(url);
            return (
              <TouchableOpacity key={index} onPress={() => openCitizenGallery(index)}>
                {isVid ? (
                  <View style={[styles.evidencePhoto, styles.videoPlaceholder]}>
                    <Ionicons name="videocam-outline" size={30} color="white" />
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

        {/* Section: Resolution Proof */}
        {
          (selectedTicket.status === 'resolved' || selectedTicket.status === 'verified') && selectedTicket.afterPhoto && (
            <View style={styles.resolutionSection}>
              <Text style={[styles.sectionHeader, { color: COLORS.success }]}>
                Resolution Proof (Engineer)
              </Text>

              <TouchableOpacity onPress={openProofGallery}>
                {isVideo(selectedTicket.afterPhoto) ? (
                  <View style={[styles.evidencePhoto, styles.videoPlaceholder, styles.proofBorder]}>
                    <Ionicons name="checkmark-circle-outline" size={40} color="white" />
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold', marginTop: 5 }}>PLAY PROOF</Text>
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

  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

  return (
    <View style={STYLES.container}>
      <TutorialOverlay role="dispatcher" page="inbox" />
      {/* HEADER */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerTitle}>Dispatcher Console</Text>
          <Text style={styles.headerSub}>Manage and assign tickets</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <View style={styles.avatarCircle}>
              {user?.email ? (
                <Text style={styles.avatarText}>{(user?.displayName || user.email).charAt(0).toUpperCase()}</Text>
              ) : (
                <Ionicons name="person-circle-outline" size={40} color={COLORS.primary} />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.splitView}>
        {/* Left Column: List */}
        {(!isMobile || (isMobile && !selectedTicket)) && (
          <View style={[styles.listColumn, isMobile && { flex: 1 }]}>
            <Text style={styles.columnHeader}>Incoming Reports</Text>

            {/* FILTER TABS */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, filter === 'active' && styles.activeTab]}
                onPress={() => setFilter('active')}
              >
                <Text style={[styles.tabText, filter === 'active' && styles.activeTabText]}>Active</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, filter === 'resolved' && styles.activeTab]}
                onPress={() => setFilter('resolved')}
              >
                <Text style={[styles.tabText, filter === 'resolved' && styles.activeTabText]}>Resolved</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredTickets}
              renderItem={({ item }) => <TicketRow item={item} />}
              keyExtractor={(item, index) => item.id || String(index)}
              ListEmptyComponent={<Text style={{ padding: 20, color: '#999', textAlign: 'center' }}>No tickets in this section.</Text>}
            />
          </View>
        )}

        {/* Right Column: Details */}
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
            <DetailPanel />
          </View>
        )}

        {/* Gallery Modal */}
        {selectedTicket && (
          <MediaGalleryModal
            visible={galleryVisible}
            onClose={() => setGalleryVisible(false)}
            mediaUrls={galleryItems}
            initialIndex={galleryIndex}
          />
        )}

        {/* Assign Modal */}
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
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  splitView: { flex: 1, flexDirection: 'row', gap: 20 },
  listColumn: { flex: 0.4, backgroundColor: 'white', borderRadius: 12, padding: 10, ...STYLES.shadow },
  columnHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginLeft: 10, color: COLORS.primary },
  row: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  rowActive: { backgroundColor: '#eef2f7' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  rowTitle: { fontWeight: '600', color: COLORS.primary },
  rowSub: { fontSize: 12, color: '#999', marginTop: 2 },
  detailColumn: { flex: 0.6, backgroundColor: 'white', borderRadius: 12, padding: 20, ...STYLES.shadow },
  emptyDetail: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#ccc', fontSize: 18 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  detailTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusBadgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  description: { fontSize: 16, color: '#555', lineHeight: 24, marginBottom: 20 },
  actionBar: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionBtn: { backgroundColor: COLORS.primary, padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '600' },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
  photoGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  evidencePhoto: { width: 100, height: 100, borderRadius: 8, backgroundColor: '#eee' },
  videoPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  resolutionSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#f0f0f0',
  },
  proofBorder: {
    borderWidth: 3,
    borderColor: COLORS.success,
    width: 150,
    height: 150,
  },
  noteBox: {
    marginTop: 10,
    backgroundColor: '#F0F9F4',
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
  duplicateTitle: { color: '#856404', fontWeight: 'bold' },
  duplicateSub: { fontSize: 12, color: '#856404', marginBottom: 10 },
  duplicateRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: 8, backgroundColor: 'rgba(255,255,255,0.5)',
    marginBottom: 5, borderRadius: 4
  },
  mergeBtn: { marginTop: 10, alignItems: 'center' },
  badgeContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start'
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center'
  },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 18 },

  // Tabs
  tabContainer: { flexDirection: 'row', marginBottom: 15, marginHorizontal: 10, backgroundColor: '#f0f0f0', borderRadius: 8, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: 'white', ...STYLES.shadow },
  tabText: { fontWeight: '600', color: '#666', fontSize: 12 },
  activeTabText: { color: COLORS.primary }
});