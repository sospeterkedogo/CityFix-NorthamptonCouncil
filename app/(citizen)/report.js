import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet, Image, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, STYLES } from '../../src/constants/theme';
import { TicketService } from '../../src/services/ticketService';
import { MediaService } from '../../src/services/mediaService';
import LocationPickerModal from '../../src/components/LocationPickerModal';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import MapPreview from '../../src/components/MapPreview';

const DRAFTS_KEY = 'report_drafts';


export default function ReportIssueScreen() {
  const router = useRouter();
  const { resume } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false); // Local state for upload progress
  const { user } = useAuth();

  // Draft ID State
  const [id, setId] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('pothole');
  const [customCategory, setCustomCategory] = useState('');
  const [location, setLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);

  // Media State
  const [media, setMedia] = useState([]); // Array of local URIs

  // 1. Check for Draft on Mount
  useEffect(() => {
    // If draftId is passed, load that specific draft
    const { draftId } = router.params || {}; // Get params directly or useLocalSearchParams above

    if (draftId) {
      loadDraft(draftId);
    }
    // We NO LONGER check for "any" draft on mount to avoid nagging. 
    // Users must click "Resume" from dashboard to resume.
  }, [router.params]);

  const loadDraft = async (id) => {
    try {
      const json = await AsyncStorage.getItem(DRAFTS_KEY);
      if (json) {
        const drafts = JSON.parse(json);
        const draft = drafts.find(d => d.id === id);

        if (draft) {
          setId(id); // Track current draft ID
          setTitle(draft.title || '');
          setDesc(draft.desc || '');
          setLocation(draft.location || null);
          setMedia(draft.media || []);
          setCategory(draft.category || 'pothole');
          setCustomCategory(draft.customCategory || '');
        }
      }
    } catch (e) {
      console.error("Error loading draft", e);
    }
  };

  // 2. Save Draft Function
  const handleSaveDraft = async () => {
    try {
      const json = await AsyncStorage.getItem(DRAFTS_KEY);
      let drafts = json ? JSON.parse(json) : [];

      const now = Date.now();

      const draftData = {
        id: id || now.toString(), // Use existing ID or create new one
        updatedAt: now,
        title,
        desc,
        location,
        media,
        category,
        customCategory
      };

      if (id) {
        // Update existing
        const index = drafts.findIndex(d => d.id === id);
        if (index > -1) drafts[index] = draftData;
        else drafts.push(draftData);
      } else {
        // New Draft
        setId(draftData.id);
        drafts.push(draftData);
      }

      await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));

      Alert.alert("Saved", "Draft saved to 'my drafts'.", [
        { text: "OK", onPress: () => router.back() }
      ]);

    } catch (e) {
      console.log("Error saving draft", e);
    }
  };

  const removeCurrentDraft = async () => {
    if (!id) return;
    try {
      const json = await AsyncStorage.getItem(DRAFTS_KEY);
      if (json) {
        let drafts = JSON.parse(json);
        drafts = drafts.filter(d => d.id !== id);
        await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
      }
    } catch (e) {
      console.log("Error removing draft", e);
    }
  };

  // 1. Pick Media (Images/Videos)
  const handleAddMedia = () => {
    if (media.length >= 3) {
      Alert.alert("Limit Reached", "You can only upload up to 3 evidence files.");
      return;
    }

    if (Platform.OS === 'web') {
      // Web doesn't support complex Alerts. Just open the file picker directly.
      openGallery();
      return;
    }

    Alert.alert(
      "Add Evidence",
      "Choose a source",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Take Photo/Video", onPress: openCamera },
        { text: "Choose from Library", onPress: openGallery },
      ]
    );
  };

  // 2. Open Gallery
  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your gallery.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.2, // compression!
      videoMaxDuration: 20,
    });

    processPickerResult(result);
  };

  // 3. Open Camera
  const openCamera = async () => {
    // Ask for Camera Permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your camera.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true, // Allows trimming video or cropping photo
      aspect: [4, 3],
      quality: 0.2, // Crucial for bandwidth
      videoMaxDuration: 20, // 20s limit
    });

    processPickerResult(result);
  };

  // 4. Helper to save the file
  const processPickerResult = (result) => {
    if (!result.canceled) {
      setMedia(currentMedia => [...currentMedia, result.assets[0]]);
    }
  };

  const handleSubmit = async () => {
    if (!title || !desc || !location) {
      if (Platform.OS === 'web') {
        window.alert("Missing Info: Please fill in all fields and location.");
      } else {
        Alert.alert("Missing Info", "Please fill in all fields and location.");
      }
      return;
    }

    if (category === 'other' && !customCategory.trim()) {
      Alert.alert("Missing Info", "Please specify the 'Other' category.");
      return;
    }

    setLoading(true);

    try {
      // --- THE UPLOAD LOOP ---
      let uploadedUrls = [];

      if (media.length > 0) {
        setUploading(true);
        console.log("Starting Upload for", media.length, "files...");

        const uploadPromises = media.map(file =>
          MediaService.uploadFile(file.uri, `users/${user.uid}/reports`)
        );

        uploadedUrls = await Promise.all(uploadPromises);
        console.log("Uploads complete");
        setUploading(false);
      }
      // ---------------------------

      // ---------------------------

      const finalCategory = category === 'other' ? customCategory : category;

      const result = await TicketService.submitTicket(
        user.uid, title, desc, finalCategory,
        location.latitude, location.longitude,
        uploadedUrls
      );

      setLoading(false);

      if (result.success) {
        await removeCurrentDraft();

        const successMsg = "Your report has been submitted successfully.";

        if (Platform.OS === 'web') {
          window.alert("Success: " + successMsg);
          router.replace('/(citizen)/dashboard');
        } else {
          Alert.alert(
            "Success",
            successMsg,
            [{ text: "OK", onPress: () => router.replace('/(citizen)/dashboard') }]
          );
        }
      } else {
        const errorMsg = "Error: " + result.error;
        if (Platform.OS === 'web') {
          window.alert(errorMsg);
        } else {
          Alert.alert("Submission Failed", result.error);
        }
      }

    } catch (e) {
      console.error("Crash:", e);
      setLoading(false);
      setUploading(false);

      const crashMsg = e.message || "An unexpected error occurred. Please try again.";
      if (Platform.OS === 'web') {
        window.alert("Error: " + crashMsg);
      } else {
        Alert.alert("Error", crashMsg);
      }
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={[STYLES.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 20 }}>Loading User Profile...</Text>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={[STYLES.container, Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <TouchableOpacity onPress={() => router.push('/')} style={{ marginBottom: 10 }}>
          <Text style={{ color: COLORS.action, fontSize: 16 }}>
            <Ionicons name="arrow-back" size={16} color={COLORS.action} /> Back
          </Text>
        </TouchableOpacity>
        <Text style={styles.header}>Report an Issue</Text>

        {/* ... Title, Category Inputs ... */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Issue Title <Text style={styles.required}>*</Text></Text>
          <Text style={styles.helperText}>Give a short, clear name to the problem.</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Broken Streetlight on Main St"
            value={title} onChangeText={setTitle}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>
          <Text style={styles.helperText}>Select the best category for this issue.</Text>
          <View style={{ flexWrap: 'wrap', flexDirection: 'row', gap: 10 }}>
            {['pothole', 'street_light', 'rubbish', 'other'].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.catButton, category === cat && styles.catButtonActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.catText, category === cat && styles.catTextActive]}>
                  {cat.replace('_', ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Category Input */}
          {category === 'other' && (
            <View style={{ marginTop: 10 }}>
              <TextInput
                style={styles.input}
                placeholder="Please specify category..."
                value={customCategory}
                onChangeText={setCustomCategory}
              />
            </View>
          )}
        </View>

        {/* ... Location Button (Map Widget) ... */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location <Text style={styles.required}>*</Text></Text>
          <Text style={styles.helperText}>Tap the map to pin the exact location.</Text>

          <TouchableOpacity onPress={() => setShowMap(true)} style={styles.mapWidgetContainer} activeOpacity={0.9}>
            {/* Map Preview Widget (Platform Specific) */}
            <MapPreview location={location} />

            {/* Overlay: Prompt when no location */}
            {!location && (
              <View style={styles.mapOverlay}>
                <Text style={styles.mapPrompt}>Tap to Set Location</Text>
              </View>
            )}

            {/* Status Badge (if set) */}
            {location && (
              <View style={[styles.locationBadge, { maxWidth: '80%' }]}>
                <Ionicons name="checkmark-circle" size={14} color="white" />
                <Text style={styles.locationBadgeText} numberOfLines={1}>
                  {location.address || "Location Set"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* --- MEDIA PICKER UI --- */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Evidence (Photos/Video)</Text>
          <Text style={styles.helperText}>Max 3 files. Helping us see the issue speeds up fixes.</Text>

          <View style={styles.mediaContainer}>
            {media.map((item, index) => (
              <View key={index} style={styles.thumbnailWrapper}>

                {/* --- FIX FOR THUMBNAILS --- */}
                {item.type === 'video' ? (
                  // Render a placeholder for videos
                  <View style={[styles.thumbnail, styles.videoPlaceholder]}>
                    <Ionicons name="videocam-outline" size={24} color={COLORS.text.secondary} />
                    <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold' }}>VIDEO</Text>
                  </View>
                ) : (
                  // Render the image for photos
                  Platform.OS === 'web' ? (
                    <img
                      src={item.uri}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                      alt="Evidence"
                    />
                  ) : (
                    <Image source={{ uri: item.uri }} style={styles.thumbnail} />
                  )
                )}

                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => setMedia(media.filter((_, i) => i !== index))}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>X</Text>
                </TouchableOpacity>
              </View>
            ))}

            {media.length < 3 && (
              <TouchableOpacity style={styles.addMediaBtn} onPress={handleAddMedia}>
                <Text style={{ fontSize: 24, color: COLORS.text.secondary }}>+</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
          <Text style={styles.helperText}>Describe the issue in more detail (e.g. size, danger level).</Text>
          <TextInput
            style={[styles.input, { height: 100 }]}
            multiline value={desc} onChangeText={setDesc}
          />
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.draftBtn}
            onPress={handleSaveDraft}
            disabled={loading}
          >
            <Ionicons name="save-outline" size={20} color={COLORS.action} style={{ marginRight: 8 }} />
            <Text style={styles.draftText}>Save Draft</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitText}>SUBMIT REPORT</Text>
            )}
          </TouchableOpacity>
        </View>

        <LocationPickerModal
          visible={showMap}
          onClose={() => setShowMap(false)}
          onSelectLocation={setLocation}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary, marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginBottom: 4 },
  required: { color: COLORS.error },
  helperText: { fontSize: 12, color: '#666', marginBottom: 8, fontStyle: 'italic' },
  input: { backgroundColor: COLORS.card, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ddd' },
  catButton: { padding: 8, paddingHorizontal: 16, borderRadius: 5, backgroundColor: '#eee' },
  catButtonActive: { backgroundColor: COLORS.action },
  catText: { color: '#666', fontSize: 12, fontWeight: 'bold' },
  catTextActive: { color: 'white' },

  // Map Widget Styles
  mapWidgetContainer: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...STYLES.shadow,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)', // Slight tint
  },
  mapPrompt: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    ...STYLES.shadowSmall,
  },
  locationBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: COLORS.success,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
    ...STYLES.shadowSmall,
  },
  locationBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  submitButton: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  backButton: { backgroundColor: COLORS.action, padding: 5, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  mediaContainer: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  thumbnailWrapper: { width: 80, height: 80, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  thumbnail: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 2, right: 2, backgroundColor: 'red', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addMediaBtn: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed' },
  videoPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 30,
    marginBottom: 50,
  },
  draftBtn: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  draftText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  submitBtn: {
    flex: 2, // Submit button is bigger
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    ...STYLES.shadow,
  },
  submitText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});