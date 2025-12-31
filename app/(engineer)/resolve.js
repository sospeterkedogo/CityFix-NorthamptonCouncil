import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, StyleSheet, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, STYLES } from '../../src/constants/theme';
import { TicketService } from '../../src/services/ticketService';
import { MediaService } from '../../src/services/mediaService';
import { Ionicons } from '@expo/vector-icons';

export default function ResolveJobScreen() {
  const router = useRouter();
  const { ticketId } = useLocalSearchParams(); // Get ID passed from Dashboard

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  // Resolution State
  const [notes, setNotes] = useState('');
  const [afterPhoto, setAfterPhoto] = useState(null); // Local URI
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    if (!ticketId) return;
    const data = await TicketService.getTicketById(ticketId);
    setTicket(data);
    setLoading(false);
  };

  // 1. Take the "After" Photo (Camera Only for authenticity!)
  const takeAfterPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "We need the camera to verify the fix.");
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.3, // Compress for speed
    });

    if (!result.canceled) {
      setAfterPhoto(result.assets[0]);
    }
  };

  // 2. Submit Resolution
  const handleResolve = async () => {
    if (!notes) {
      Alert.alert("Missing Notes", "Please add a short note about what you fixed.");
      return;
    }
    if (!afterPhoto) {
      Alert.alert("Evidence Required", "You cannot close this job without an 'After' photo.");
      return;
    }

    setUploading(true);

    try {
      // A. Upload the After Photo
      const downloadUrl = await MediaService.uploadFile(afterPhoto.uri, 'resolutions');

      // B. Update Firestore
      const result = await TicketService.resolveTicket(ticket.id, notes, downloadUrl);

      setUploading(false);

      if (result.success) {
        Alert.alert("Success", "Ticket Resolved!", [
          { text: "OK", onPress: () => router.replace('/(engineer)/dashboard') }
        ]);
        router.replace('/(engineer)/dashboard');
      } else {
        alert("Error: " + result.error);
      }
    } catch (e) {
      setUploading(false);
      Alert.alert("Upload Failed", "Could not upload the proof. Try again.");
    }
  };

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;
  if (!ticket) return <Text>Job not found.</Text>;

  return (
    <View style={STYLES.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}
        showsVerticalScrollIndicator={false}
      >

        {/* HEADER: Back & Title */}
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Resolve Job #{ticket.id.slice(0, 5)}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* JOB SUMMARY CARD */}
        <View style={styles.summaryCard}>
          <View style={styles.badgeRow}>
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>{ticket.priority?.toUpperCase() || 'NORMAL'}</Text>
            </View>
            <Text style={styles.statusText}>{ticket.status.toUpperCase()}</Text>
          </View>
          <Text style={styles.jobTitle}>{ticket.title}</Text>
          <Text style={styles.jobDesc}>{ticket.description}</Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={16} color={COLORS.text.secondary} />
            <Text style={styles.locationText}>
              {ticket.location?.address || `${ticket.location?.latitude.toFixed(4)}, ${ticket.location?.longitude.toFixed(4)}`}
            </Text>
          </View>
        </View>

        {/* STEP 1: REVIEW EVIDENCE */}
        <Text style={styles.stepTitle}>STEP 1: Review Issue</Text>
        <Text style={styles.stepSub}>Check the original report photos.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.evidenceScroll}>
          {ticket.photos?.length > 0 ? (
            ticket.photos.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.beforeImage} />
            ))
          ) : (
            <Text style={{ color: '#999', fontStyle: 'italic', padding: 10 }}>No photos provided.</Text>
          )}
        </ScrollView>

        <View style={styles.divider} />

        {/* STEP 2: PROOF OF WORK */}
        <Text style={styles.stepTitle}>STEP 2: Verify Fix</Text>
        <Text style={styles.stepSub}>Take a photo of the completed work. This is required.</Text>

        <TouchableOpacity style={styles.cameraBox} onPress={takeAfterPhoto}>
          {afterPhoto ? (
            <Image source={{ uri: afterPhoto.uri }} style={styles.afterImage} />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <View style={styles.cameraCircle}>
                <Ionicons name="camera" size={32} color="white" />
              </View>
              <Text style={styles.cameraText}>Take Solution Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {afterPhoto && (
          <TouchableOpacity onPress={takeAfterPhoto} style={styles.retakeBtn}>
            <Text style={styles.retakeText}>Retake Photo</Text>
          </TouchableOpacity>
        )}

        {/* STEP 3: NOTES */}
        <Text style={styles.sectionHeader}>Engineer Notes</Text>
        <TextInput
          style={styles.input}
          placeholder="Describe what you did (e.g. 'Filled pothole, sealed edges')..."
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
        />

        {/* ACTION */}
        <TouchableOpacity
          style={[
            styles.resolveButton,
            (!afterPhoto || !notes) && styles.disabledButton
          ]}
          onPress={handleResolve}
          disabled={uploading || !afterPhoto || !notes}
        >
          {uploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-done-circle" size={24} color="white" style={{ marginRight: 10 }} />
              <Text style={styles.resolveText}>COMPLETE JOB</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },
  topHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20
  },
  backBtn: { padding: 8, borderRadius: 8, backgroundColor: '#f0f9ff' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primary },

  summaryCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 24,
    ...Platform.select({
      web: { boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
      default: { elevation: 2 }
    })
  },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  priorityBadge: { backgroundColor: '#FFEDD5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  priorityText: { color: '#C2410C', fontWeight: '800', fontSize: 11 },
  statusText: { color: '#94A3B8', fontWeight: '600', fontSize: 12 },

  jobTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  jobDesc: { fontSize: 15, color: '#64748B', lineHeight: 22, marginBottom: 16 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { color: '#64748B', fontSize: 13, fontWeight: '500' },

  stepTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  stepSub: { fontSize: 14, color: '#64748B', marginBottom: 16 },

  evidenceScroll: { flexDirection: 'row', marginBottom: 24 },
  beforeImage: { width: 140, height: 140, borderRadius: 12, marginRight: 12 },

  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 24 },

  cameraBox: {
    height: 220,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 8
  },
  cameraCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cameraText: { color: '#475569', fontWeight: '600', fontSize: 16 },
  afterImage: { width: '100%', height: '100%' },

  retakeBtn: { alignSelf: 'center', padding: 8, marginBottom: 24 },
  retakeText: { color: COLORS.action, fontWeight: '600' },

  sectionHeader: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 32,
    fontSize: 15
  },

  resolveButton: {
    backgroundColor: COLORS.success,
    padding: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  resolveText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5
  }
});