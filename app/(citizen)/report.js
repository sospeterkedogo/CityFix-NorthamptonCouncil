import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet, Image, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, STYLES } from '../../src/constants/theme';
import { TicketService } from '../../src/services/ticketService';
import { MediaService } from '../../src/services/mediaService';
import LocationPickerModal from '../../src/components/LocationPickerModal';

export default function ReportIssueScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false); // Local state for upload progress

  // Form State
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('pothole');
  const [location, setLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);
  
  // Media State
  const [media, setMedia] = useState([]); // Array of local URIs

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
      Alert.alert("Missing Info", "Please fill in all fields and location.");
      return;
    }

    setLoading(true);

    try {
      // --- THE UPLOAD LOOP ---
      let uploadedUrls = [];
      
      if (media.length > 0) {
        setUploading(true); // Show user we are uploading
        console.log("Starting Upload for", media.length, "files...");
        
        // Upload all files in parallel
        const uploadPromises = media.map(file => 
          MediaService.uploadFile(file.uri, "reports")
        );
        
        uploadedUrls = await Promise.all(uploadPromises);
        console.log("Uploads complete:", uploadedUrls);
        setUploading(false);
      }
      // ---------------------------

      const FAKE_USER_ID = "citizen-001";
      
      // Pass the URLs to the Ticket Service
      const result = await TicketService.submitTicket(
        FAKE_USER_ID, title, desc, category, 
        location.latitude, location.longitude,
        uploadedUrls // <--- Sending the URLs now
      );

      setLoading(false);

      if (result.success) {
        if (Platform.OS === 'web') {
           if(confirm("Report Submitted!")) router.back();
        } else {
          Alert.alert("Success", "Report submitted!", [{ text: "OK", onPress: () => router.back() }]);
        }
      } else {
        alert("Error: " + result.error);
      }

    } catch (e) {
      console.error("Crash:", e);
      setLoading(false);
      setUploading(false);
      alert("Upload failed. Try again.");
    }
  };

  return (
    <ScrollView contentContainerStyle={STYLES.container}>
      <Text style={styles.header}>Report an Issue</Text>
      
      {/* ... Title, Category Inputs ... */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Issue Title</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. Deep Pothole" 
          value={title} onChangeText={setTitle} 
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Category</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {['pothole', 'street_light', 'rubbish'].map((cat) => (
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
      </View>

      {/* ... Location Button ... */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Location</Text>
        <TouchableOpacity style={styles.locationButton} onPress={() => setShowMap(true)}>
          <Text style={{ fontSize: 24, marginRight: 10 }}>📍</Text>
          <Text style={styles.locationButtonText}>
            {location ? "Location Selected" : "Tap to set location"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- MEDIA PICKER UI --- */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Evidence (Photos/Video)</Text>
        
        <View style={styles.mediaContainer}>
          {media.map((item, index) => (
            <View key={index} style={styles.thumbnailWrapper}>
              
              {/* --- FIX FOR THUMBNAILS --- */}
              {item.type === 'video' ? (
                // Render a placeholder for videos
                <View style={[styles.thumbnail, styles.videoPlaceholder]}>
                  <Text style={{ fontSize: 24 }}>🎥</Text>
                  <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold' }}>VIDEO</Text>
                </View>
              ) : (
                // Render the image for photos
                <Image source={{ uri: item.uri }} style={styles.thumbnail} />
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
        <Text style={styles.label}>Description</Text>
        <TextInput 
          style={[styles.input, { height: 100 }]} 
          multiline value={desc} onChangeText={setDesc} 
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity 
        style={styles.submitButton} 
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color={COLORS.text.light} />
            <Text style={styles.submitText}>
              {uploading ? "UPLOADING MEDIA..." : "SUBMITTING..."}
            </Text>
          </View>
        ) : (
          <Text style={styles.submitText}>SUBMIT REPORT</Text>
        )}
      </TouchableOpacity>

      <LocationPickerModal 
        visible={showMap} 
        onClose={() => setShowMap(false)}
        onSelectLocation={setLocation}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary, marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginBottom: 8 },
  input: { backgroundColor: COLORS.card, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ddd' },
  catButton: { padding: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#eee' },
  catButtonActive: { backgroundColor: COLORS.action },
  catText: { color: '#666', fontSize: 12, fontWeight: 'bold' },
  catTextActive: { color: 'white' },
  locationButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F6F3', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.action, borderStyle: 'dashed' },
  locationButtonText: { color: COLORS.primary, fontWeight: 'bold' },
  submitButton: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
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
});