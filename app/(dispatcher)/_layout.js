import { useAuth } from '../../src/context/AuthContext';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions, Alert } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { COLORS, SPACING } from '../../src/constants/theme';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function DispatcherLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();

  const isMobile = width < 768;

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

  // Sidebar navigation item
  const NavItem = ({ label, route, iconName }) => {
    const isActive = pathname === route;
    return (
      <TouchableOpacity
        style={[styles.navItem, isActive && styles.navItemActive]}
        onPress={() => {
          router.push(route);
          if (isMobile) setSidebarOpen(false);
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name={iconName} size={20} color={isActive ? "white" : "#bdc3c7"} style={{ marginRight: 10 }} />
          <Text style={[styles.navText, isActive && styles.navTextActive]}>
            {label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>

      {/* Mobile Header with Hamburger Menu */}
      {isMobile && (
        <View style={styles.mobileHeader}>
          <TouchableOpacity onPress={() => setSidebarOpen(true)} style={{ padding: 5 }}>
            <Ionicons name="menu-outline" size={28} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginLeft: 15 }}>Admin Console</Text>
        </View>
      )}

      {/* Mobile Backdrop */}
      {isMobile && sidebarOpen && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      {(!isMobile || sidebarOpen) && (
        <View style={[styles.sidebar, isMobile && styles.mobileSidebar]}>
          {isMobile && (
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSidebarOpen(false)}>
              <Ionicons name="close-outline" size={28} color="white" />
            </TouchableOpacity>
          )}

          <View style={styles.logoArea}>
            <Text style={styles.logoText}>CityFix <Text style={{ fontWeight: '300' }}>Admin</Text></Text>
          </View>

          <View style={styles.navMenu}>
            <NavItem label="Inbox" route="/(dispatcher)" iconName="mail-unread-outline" />
            <NavItem label="Map View" route="/(dispatcher)/map" iconName="map-outline" />
            <NavItem label="Engineers" route="/(dispatcher)/engineers" iconName="people-outline" />
            <NavItem label="Settings" route="/(dispatcher)/settings" iconName="settings-outline" />
          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="log-out-outline" size={20} color="#e74c3c" style={{ marginRight: 10 }} />
              <Text style={styles.logoutText}>Log Out</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content Area */}
      <View style={[styles.content, isMobile && { paddingTop: 80, paddingLeft: 10, paddingRight: 10 }]}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    height: Platform.OS === 'web' ? '100vh' : '100%',
  },
  mobileHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 60,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    zIndex: 10,
    borderBottomWidth: 1,
    borderColor: '#ddd',
    elevation: 4,
  },
  sidebar: {
    width: 250,
    backgroundColor: COLORS.primary,
    padding: SPACING.m,
    justifyContent: 'space-between',
    zIndex: 20,
  },
  mobileSidebar: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0,
    width: '80%',
    maxWidth: 300,
    ...Platform.select({
      web: { boxShadow: '4px 0 10px rgba(0,0,0,0.3)' },
      default: { elevation: 10 }
    })
  },
  backdrop: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 15,
  },
  closeBtn: {
    position: 'absolute',
    top: 15, right: 15,
    padding: 5,
    zIndex: 25,
  },
  logoArea: { marginBottom: 40, paddingLeft: 10, marginTop: 10 },
  logoText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  navMenu: { flex: 1 },
  navItem: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 5,
  },
  navItemActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  navText: { color: '#bdc3c7', fontSize: 16, fontWeight: '500' },
  navTextActive: { color: 'white', fontWeight: 'bold' },
  logoutBtn: { padding: 15 },
  logoutText: { color: '#e74c3c', fontWeight: 'bold' },
  content: {
    flex: 1,
    padding: SPACING.l,
  },
});