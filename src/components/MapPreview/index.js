import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const DEFAULT_REGION = {
    latitude: 52.2405,
    longitude: -0.9027,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
};

export default function MapPreview({ location }) {
    return (
        <View style={{ flex: 1 }} pointerEvents="none">
            <MapView
                style={styles.mapBackground}
                initialRegion={location ? {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                } : DEFAULT_REGION}
                region={location ? {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                } : null}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
            >
                {location && (
                    <Marker
                        coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                    />
                )}
            </MapView>
        </View>
    );
}

const styles = StyleSheet.create({
    mapBackground: {
        width: '100%',
        height: '100%',
        opacity: 0.8,
    },
});
