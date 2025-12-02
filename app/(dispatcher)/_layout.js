import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { COLORS, SPACING } from '../../src/constants/theme';

export default function DispatcherLayout() {
  const router = useRouter();
  const pathname = usePathname();

  // Simple Sidebar Item Component
  const NavItem = ({ label, route, icon }) => {
    const isActive = pathname === route;
    return (
      <TouchableOpacity 
        style={[styles.navItem, isActive && styles.navItemActive]}
        onPress={() => router.push(route)}
      >
        <Text style={[styles.navText, isActive && styles.navTextActive]}>
          {icon}  {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* SIDEBAR (Only visible on Web/Desktop usually, but we'll force it for now) */}
      <View style={styles.sidebar}>
        <View style={styles.logoArea}>
          <Text style={styles.logoText}>CityFix <Text style={{fontWeight:'300'}}>Admin</Text></Text>
        </View>
        
        <View style={styles.navMenu}>
          <NavItem label="Inbox" route="/(dispatcher)" icon="📥" />
          <NavItem label="Map View" route="/(dispatcher)/map" icon="🗺️" />
          <NavItem label="Engineers" route="/(dispatcher)/engineers" icon="👷" />
          <NavItem label="Settings" route="/(dispatcher)/settings" icon="⚙️" />
        </View>

        <TouchableOpacity 
          style={styles.logoutBtn}
          onPress={() => router.replace('/')} // Back to Login
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* MAIN CONTENT AREA */}
      <View style={styles.content}>
        <Slot /> 
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row', // This creates the Sidebar | Content layout
    backgroundColor: '#f3f4f6',
    height: Platform.OS === 'web' ? '100vh' : '100%',
  },
  sidebar: {
    width: 250,
    backgroundColor: COLORS.primary,
    padding: SPACING.m,
    justifyContent: 'space-between',
  },
  logoArea: { marginBottom: 40, paddingLeft: 10 },
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
  content: { flex: 1, padding: SPACING.l },
});