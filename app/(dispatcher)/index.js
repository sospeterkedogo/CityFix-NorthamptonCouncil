import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Linking, ScrollView 
} from 'react-native';
import { TicketService } from '../../src/services/ticketService';
import { COLORS, SPACING, STYLES } from '../../src/constants/theme';
import MediaGalleryModal from '../../src/components/MediaGalleryModal';

export default function DispatcherInbox() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

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

  const openGallery = (index) => {
    setGalleryIndex(index);
    setGalleryVisible(true);
  };

  // Helper: Open Google Maps for the Dispatcher
  const openExternalMap = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url);
  };

  // --- COMPONENT: List Item ---
  const TicketRow = ({ item }) => (
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
        <Text style={styles.rowSub}>
          {item.category.toUpperCase()} • {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  // --- COMPONENT: Right Detail Panel ---
  const DetailPanel = () => {
    if (!selectedTicket) return (
      <View style={styles.emptyDetail}>
        <Text style={styles.emptyText}>Select a ticket to view details</Text>
      </View>
    );

    return (
      <ScrollView style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>{selectedTicket.title}</Text>
          <View style={[styles.badge, { backgroundColor: getStatusColor(selectedTicket.status) }]}>
            <Text style={styles.badgeText}>{selectedTicket.status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.description}>{selectedTicket.description}</Text>

        {/* Action Bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => openExternalMap(selectedTicket.location.latitude, selectedTicket.location.longitude)}
          >
            <Text style={styles.btnText}>📍 Open in Maps</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.action }]}>
            <Text style={styles.btnText}>👷 Assign Engineer</Text>
          </TouchableOpacity>
        </View>

        {/* Evidence Grid */}
        <Text style={styles.sectionHeader}>Evidence</Text>
        <View style={styles.photoGrid}>
          {selectedTicket.photos && selectedTicket.photos.map((url, index) => {
            const isVid = isVideo(url);
            
            return (
              <TouchableOpacity 
                key={index} 
                onPress={() => openGallery(index)} // <--- Open Modal
                style={styles.mediaWrapper}
              >
                {isVid ? (
                  // RENDER VIDEO THUMBNAIL (Placeholder style)
                  <View style={[styles.evidencePhoto, styles.videoPlaceholder]}>
                    <Text style={{ fontSize: 24 }}>🎥</Text>
                    <Text style={styles.videoLabel}>PLAY</Text>
                  </View>
                ) : (
                  // RENDER IMAGE THUMBNAIL
                  <Image source={{ uri: url }} style={styles.evidencePhoto} />
                )}
              </TouchableOpacity>
            );
          })}
          
          {(!selectedTicket.photos || selectedTicket.photos.length === 0) && (
            <Text style={{ color: '#999' }}>No evidence provided.</Text>
          )}
        </View>
        
        <View style={{ height: 50 }} />
      </ScrollView>
    );
  };

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

  return (
    <View style={styles.splitView}>
      {/* LEFT: List */}
      <View style={styles.listColumn}>
        <Text style={styles.columnHeader}>Incoming Reports ({tickets.length})</Text>
        <FlatList 
          data={tickets}
          renderItem={({ item }) => <TicketRow item={item} />}
          keyExtractor={(item) => item.id}
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
          mediaUrls={selectedTicket.photos || []}
          initialIndex={galleryIndex}
        />
      )}
    </View>
  );
}

// Helpers
const getStatusColor = (status) => {
  if (status === 'resolved') return COLORS.success;
  if (status === 'in_progress') return COLORS.warning;
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
  }
});