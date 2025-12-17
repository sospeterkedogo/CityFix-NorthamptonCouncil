import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator
} from 'react-native';
import { COLORS, SPACING, STYLES } from '../constants/theme';

import { UserService } from '../services/userService';

export default function AssignEngineerModal({ visible, onClose, onAssign }) {
  const [loading, setLoading] = useState(false);
  const [engineers, setEngineers] = useState([]);

  React.useEffect(() => {
    if (visible) {
      loadEngineers();
    }
  }, [visible]);

  const loadEngineers = async () => {
    const data = await UserService.getAllEngineers();
    setEngineers(data);
  };

  const handleSelect = async (engineer) => {
    setLoading(true);
    // Simulate network delay or wait for parent promise
    await onAssign(engineer);
    setLoading(false);
    onClose();
  };

  const renderEngineer = ({ item }) => (
    <TouchableOpacity
      style={styles.engineerRow}
      onPress={() => handleSelect(item)}
      disabled={loading}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={[
          styles.status,
          { color: item.status === 'Available' ? COLORS.success : COLORS.text.secondary }
        ]}>
          {item.status}
        </Text>
      </View>
      <Text style={styles.assignText}>Assign ›</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>

          <View style={styles.header}>
            <Text style={styles.title}>Assign Field Engineer</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{ marginTop: 10 }}>Updating Ticket...</Text>
            </View>
          ) : (
            <FlatList
              data={engineers}
              keyExtractor={(item, index) => item.id || String(index)}
              renderItem={renderEngineer}
              contentContainerStyle={{ padding: SPACING.m }}
            />
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: 'white',
    borderRadius: 12,
    height: '60%',
    ...STYLES.shadow,
  },
  header: {
    padding: SPACING.m,
    borderBottomWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  closeText: {
    color: COLORS.error,
    fontWeight: '600',
  },
  engineerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  status: {
    fontSize: 12,
    marginTop: 2,
  },
  assignText: {
    color: COLORS.action,
    fontWeight: 'bold',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});