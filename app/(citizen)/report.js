// app/(citizen)/report.js
import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet 
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, STYLES } from '../../src/constants/theme';
import { TicketService } from '../../src/services/ticketService';

export default function ReportIssueScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('pothole'); // Default

  const handleSubmit = async () => {
    if (!title || !desc) {
      Alert.alert("Missing Info", "Please fill in all fields.");
      return;
    }

    setLoading(true);
    
    // HARDCODED VALUES FOR NOW (We will fix these in Phase 4)
    const FAKE_USER_ID = "citizen-001";
    const FAKE_LAT = 52.2405; 
    const FAKE_LNG = -0.9027;

    const result = await TicketService.submitTicket(
      FAKE_USER_ID, title, desc, category, FAKE_LAT, FAKE_LNG
    );

    setLoading(false);

    if (result.success) {
      Alert.alert("Success", "Report submitted successfully!", [
        { text: "OK", onPress: () => router.back() } // Go back to dashboard
      ]);
    } else {
      Alert.alert("Error", "Failed to submit report. Try again.");
    }
  };

  return (
    <ScrollView contentContainerStyle={STYLES.container}>
      <Text style={styles.header}>Report an Issue</Text>
      <Text style={styles.subHeader}>Help us fix Northampton.</Text>

      {/* Title Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Issue Title</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. Deep Pothole on High St"
          placeholderTextColor={COLORS.text.secondary}
          value={title}
          onChangeText={setTitle}
        />
      </View>

      {/* Category Selection (Simple Tabs) */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Category</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {['pothole', 'street_light', 'rubbish'].map((cat) => (
            <TouchableOpacity 
              key={cat}
              style={[
                styles.catButton, 
                category === cat && styles.catButtonActive
              ]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[
                styles.catText, 
                category === cat && styles.catTextActive
              ]}>
                {cat.replace('_', ' ').toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Description Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput 
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
          placeholder="Describe the issue in detail..."
          placeholderTextColor={COLORS.text.secondary}
          multiline
          numberOfLines={4}
          value={desc}
          onChangeText={setDesc}
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity 
        style={styles.submitButton} 
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.text.light} />
        ) : (
          <Text style={styles.submitText}>SUBMIT REPORT</Text>
        )}
      </TouchableOpacity>

    </ScrollView>
  );
}

// Local styles using our Design System constants
const styles = StyleSheet.create({
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  subHeader: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xl,
  },
  inputGroup: {
    marginBottom: SPACING.l,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.s,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: SPACING.m,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
    color: COLORS.text.primary,
  },
  catButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
  },
  catButtonActive: {
    backgroundColor: COLORS.action,
  },
  catText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  catTextActive: {
    color: COLORS.text.light,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.m,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: SPACING.m,
    ...STYLES.shadow,
  },
  submitText: {
    color: COLORS.text.light,
    fontWeight: 'bold',
    fontSize: 16,
  }
});