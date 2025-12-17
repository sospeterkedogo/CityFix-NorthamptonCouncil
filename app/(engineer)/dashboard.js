import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Switch, ActivityIndicator, Alert, Platform, Linking
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { TicketService } from '../../src/services/ticketService';
import { UserService } from '../../src/services/userService';
import { COLORS, SPACING, STYLES } from '../../src/constants/theme';
import * as Location from 'expo-location';
import { getDistanceKm } from '../../src/utils/geo';

export default function EngineerDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true); // Default Available
  const [myLocation, setMyLocation] = useState(null);

  // Use the logged-in user's ID
  const ENGINEER_ID = user?.uid;
  // We'll get the name from the profile fetch logic
  const [engineerName, setEngineerName] = useState(user?.displayName || 'Engineer');

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  const loadDashboard = async () => {
    setLoading(true);

    // 1. Load Profile (Status)
    if (!ENGINEER_ID) return;
    const profile = await UserService.getEngineerProfile(ENGINEER_ID);
    setIsAvailable(profile.status === 'Available');
    if (profile.name) setEngineerName(profile.name);

    // 2. Get My Location
    let loc = await Location.getCurrentPositionAsync({});
    const myLat = loc.coords.latitude;
    const myLng = loc.coords.longitude;
    setMyLocation({ lat: myLat, lng: myLng });

    // 3. Load Assigned Jobs
    const data = await TicketService.getEngineerJobs(ENGINEER_ID);
    // Filter out resolved jobs (optional, depends on workflow)
    const activeJobs = data.filter(job => job.status !== 'resolved');

    // 4. Calculate Distances & Sort
    const jobsWithDistance = activeJobs.map(job => {
      const dist = getDistanceKm(myLat, myLng, job.location.latitude, job.location.longitude);
      return { ...job, distanceKm: dist };
    });

    // Sort: Nearest First
    const sortedJobs = jobsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    setJobs(sortedJobs);
    setLoading(false);

  };

  const toggleStatus = async (value) => {
    setIsAvailable(value);
    const newStatus = value ? 'Available' : 'Busy / Holiday';
    await UserService.updateStatus(ENGINEER_ID, newStatus, engineerName);
  };

  const openExternalMap = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url);
  };

  const renderJobCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({
        pathname: '/(engineer)/resolve',
        params: { ticketId: item.id }
      })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.priorityBadge}>
          <Text style={styles.priorityText}>{item.priority?.toUpperCase() || 'NORMAL'}</Text>
        </View>
      </View>

      <Text style={styles.jobTitle}>{item.title}</Text>
      <Text style={styles.jobDesc} numberOfLines={2}>{item.description}</Text>

      <View style={styles.footer}>
        <Text style={styles.address}>
          📍 {item.location?.latitude.toFixed(4)}, {item.location?.longitude.toFixed(4)}
        </Text>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => openExternalMap(item.location.latitude, item.location.longitude)}
        >
          <Text style={styles.navText}>NAVIGATE ➔</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.distance}>
        {item.distanceKm < 1
          ? `${(item.distanceKm * 1000).toFixed(0)}m away`
          : `${item.distanceKm.toFixed(1)}km away`}
      </Text>
    </TouchableOpacity>

  );

  return (
    <View style={STYLES.container}>
      {/* HEADER */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerTitle}>Engineer Dashboard</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{user?.email?.charAt(0).toUpperCase() || 'E'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* --- STATUS HEADER --- */}
      <View style={[
        styles.statusHeader,
        { backgroundColor: isAvailable ? COLORS.success : COLORS.error }
      ]}>
        <View>
          <Text style={styles.welcomeText}>Welcome, {user?.email?.split('@')[0] || 'Engineer'}</Text>
          <Text style={styles.statusText}>
            CURRENT STATUS: {isAvailable ? 'AVAILABLE' : 'BUSY / DO NOT DISTURB'}
          </Text>
        </View>
        <Switch
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={isAvailable ? "white" : "#f4f3f4"}
          onValueChange={toggleStatus}
          value={isAvailable}
        />
      </View>

      <Text style={styles.sectionTitle}>My Active Jobs ({jobs.length})</Text>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderJobCard}
          keyExtractor={(item, index) => item.id || String(index)}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No active jobs.</Text>
              <Text style={styles.emptySub}>Enjoy your coffee break! ☕</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white', ...STYLES.shadow },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  statusHeader: {
    padding: SPACING.l,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    marginTop: SPACING.m,
    ...STYLES.shadow,
  },
  welcomeText: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.m,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.action,
    ...STYLES.shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.s,
  },
  priorityBadge: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    color: '#c2410c',
    fontSize: 10,
    fontWeight: 'bold',
  },
  distance: {
    color: COLORS.text.secondary,
    fontSize: 12,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  jobDesc: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: SPACING.m,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
    paddingTop: SPACING.s,
  },
  address: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  navButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  navText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.secondary,
  },
  emptySub: {
    marginTop: 8,
    color: '#999',
  }
});