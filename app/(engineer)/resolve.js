import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, StyleSheet, Platform 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, STYLES } from '../../src/constants/theme';
import { TicketService } from '../../src/services/ticketService';
import { MediaService } from '../../src/services/mediaService';

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
        Alert.alert("Great Job!", "Ticket marked as RESOLVED.", [
          { text: "Back to Dashboard", onPress: () => router.back() }
        ]);
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
    <ScrollView contentContainerStyle={STYLES.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Job #{ticket.id.slice(0, 5)}</Text>
        <View style={styles.priorityBadge}>
          <Text style={styles.priorityText}>{ticket.priority?.toUpperCase() || 'NORMAL'}</Text>
        </View>
      </View>

      <Text style={styles.jobTitle}>{ticket.title}</Text>
      <Text style={styles.jobDesc}>{ticket.description}</Text>

      {/* "BEFORE" EVIDENCE */}
      <Text style={styles.sectionHeader}>The Problem (Before)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.evidenceScroll}>
        {ticket.photos?.length > 0 ? (
          ticket.photos.map((url, i) => (
            <Image key={i} source={{ uri: url }} style={styles.beforeImage} />
          ))
        ) : (
          <Text style={{ color: '#999', fontStyle: 'italic' }}>No photos provided by citizen.</Text>
        )}
      </ScrollView>

      <View style={styles.divider} />

      {/* "AFTER" EVIDENCE (Input) */}
      <Text style={styles.sectionHeader}>The Fix (Proof)</Text>
      
      <TouchableOpacity style={styles.cameraBox} onPress={takeAfterPhoto}>
        {afterPhoto ? (
          <Image source={{ uri: afterPhoto.uri }} style={styles.afterImage} />
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 40 }}>📸</Text>
            <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Take 'After' Photo</Text>
            <Text style={{ color: COLORS.text.secondary, fontSize: 12 }}>(Required)</Text>
          </View>
        )}
      </TouchableOpacity>
      {afterPhoto && (
        <TouchableOpacity onPress={takeAfterPhoto}>
          <Text style={styles.retakeText}>Retake Photo</Text>
        </TouchableOpacity>
      )}

      {/* NOTES */}
      <Text style={styles.sectionHeader}>Resolution Notes</Text>
      <TextInput 
        style={styles.input}
        placeholder="e.g. Filled pothole with cold lay asphalt..."
        multiline
        numberOfLines={3}
        value={notes}
        onChangeText={setNotes}
      />

      {/* RESOLVE BUTTON */}
      <TouchableOpacity 
        style={[
          styles.resolveButton, 
          (!afterPhoto || !notes) && styles.disabledButton // Visual feedback
        ]} 
        onPress={handleResolve}
        disabled={uploading || !afterPhoto || !notes}
      >
        {uploading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.resolveText}>MARK AS RESOLVED ✓</Text>
        )}
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#999',
  },
  priorityBadge: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: { color: '#c2410c', fontSize: 10, fontWeight: 'bold' },
  jobTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, marginBottom: 5 },
  jobDesc: { fontSize: 16, color: COLORS.text.secondary, marginBottom: 20 },
  
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginBottom: 10, marginTop: 10 },
  evidenceScroll: { flexDirection: 'row', marginBottom: 20 },
  beforeImage: { width: 120, height: 120, borderRadius: 8, marginRight: 10, backgroundColor: '#eee' },
  
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  
  cameraBox: {
    height: 200,
    backgroundColor: '#E8F6F3',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  afterImage: { width: '100%', height: '100%' },
  retakeText: { textAlign: 'center', color: COLORS.action, marginTop: 5, fontWeight: 'bold' },
  
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  resolveButton: {
    backgroundColor: COLORS.success,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
    ...STYLES.shadow,
  },
  disabledButton: {
    backgroundColor: '#ccc', // Grey out if requirements not met
    elevation: 0,
  },
  resolveText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  }
});