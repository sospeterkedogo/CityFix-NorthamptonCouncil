import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, STYLES } from '../constants/theme';

export default function SearchBar({
    value,
    onChangeText,
    onSearch,
    placeholder = "Search..."
}) {
    return (
        <View style={styles.container}>
            <Ionicons name="search" size={20} color="#999" style={styles.icon} />

            <TextInput
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor="#999"
                value={value}
                onChangeText={onChangeText}
                returnKeyType="search"
                onSubmitEditing={onSearch}
                autoCapitalize="none"
                autoCorrect={false}
            />

            {value.length > 0 && (
                <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearBtn} hitSlop={10}>
                    <Ionicons name="close-circle" size={18} color="#ccc" />
                </TouchableOpacity>
            )}

            <TouchableOpacity onPress={onSearch} style={styles.searchBtn} activeOpacity={0.8}>
                <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        paddingHorizontal: 12, // slightly tighter than 15 for better fit on small screens
        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        ...STYLES.shadow
    },
    icon: {
        marginRight: 10
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        height: '100%' // Ensure full hit area
    },
    clearBtn: {
        padding: 4,
        marginRight: 8
    },
    searchBtn: {
        backgroundColor: COLORS.primary,
        padding: 8,
        borderRadius: 8,
    }
});
