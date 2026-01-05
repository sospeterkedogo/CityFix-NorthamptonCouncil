import { useState, useMemo } from 'react';
import { Alert } from 'react-native';

/**
 * Hook for client-side search filtering
 * @param {Array} data - The full dataset to search
 * @param {Array<String>} searchKeys - Array of object keys to search within (e.g. ['title', 'userName'])
 * @returns {Object} { searchQuery, setSearchQuery, filteredData, performManualSearch }
 */
export const useClientSearch = (data, searchKeys = []) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return data;

        const lowerQuery = searchQuery.toLowerCase();

        return data.filter(item => {
            return searchKeys.some(key => {
                const value = item[key];
                if (value && typeof value === 'string') {
                    return value.toLowerCase().includes(lowerQuery);
                }
                return false;
            });
        });
    }, [data, searchQuery, searchKeys]);

    const performManualSearch = () => {
        if (searchQuery.trim() && filteredData.length === 0) {
            Alert.alert("No Results", "Those details don't match any info, please try again.");
        }
    };

    return {
        searchQuery,
        setSearchQuery,
        filteredData,
        performManualSearch
    };
};
