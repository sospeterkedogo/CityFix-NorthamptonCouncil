import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Get API Key from app.json extra
const getApiKey = () => {
    // Try Expo Config
    const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
    // Debug log removed

    if (extra.googleMapsApiKey) return extra.googleMapsApiKey;

    if (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) return process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    return null; // No key found
};

const API_KEY = getApiKey();

// Helper to check if Valid
export const hasGoogleMapsKey = () => {
    return !!API_KEY && API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY';
};

// Web Support: Dynamic Script Loading
const loadGoogleMapsScript = () => {
    if (Platform.OS !== 'web') return Promise.resolve();
    if (window.google && window.google.maps && window.google.maps.places) return Promise.resolve();

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = (err) => reject(err);
        document.body.appendChild(script);
    });
};

export const getPlacePredictions = async (input) => {
    if (!input || input.length < 3) return [];
    if (!hasGoogleMapsKey()) {
        console.warn("Google Maps API Key missing.");
        return [];
    }


    if (Platform.OS === 'web') {
        try {
            await loadGoogleMapsScript();
            return new Promise((resolve) => {
                const service = new window.google.maps.places.AutocompleteService();
                service.getPlacePredictions({
                    input,
                    componentRestrictions: { country: 'gb' },
                    types: ['geocode', 'establishment']
                }, (predictions, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                        resolve(predictions);
                    } else {
                        console.warn("Web Autocomplete Error:", status);
                        resolve([]);
                    }
                });
            });
        } catch (e) {
            console.error("Web Google Maps Load Error", e);
            return [];
        }
    }

    try {

        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:gb&key=${API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK') {
            return data.predictions;
        } else {
            console.warn("Google Places Error:", data.status, data.error_message);
            return [];
        }
    } catch (error) {
        console.error("Autocomplete Fetch Error:", error);
        return [];
    }
};

export const getPlaceDetails = async (placeId) => {
    if (!hasGoogleMapsKey()) return null;


    if (Platform.OS === 'web') {
        try {
            await loadGoogleMapsScript();
            return new Promise((resolve) => {
                const dummyDiv = document.createElement('div');
                const service = new window.google.maps.places.PlacesService(dummyDiv);

                service.getDetails({
                    placeId,
                    fields: ['geometry', 'formatted_address', 'address_components']
                }, (result, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                        resolve({
                            latitude: result.geometry.location.lat(),
                            longitude: result.geometry.location.lng(),
                            address: result.formatted_address,
                            components: result.address_components
                        });
                    } else {
                        console.warn("Web Details Error:", status);
                        resolve(null);
                    }
                });
            });
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,address_components&key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK') {
            const result = data.result;
            return {
                latitude: result.geometry.location.lat,
                longitude: result.geometry.location.lng,
                address: result.formatted_address,
                components: result.address_components
            };
        }
        return null;
    } catch (error) {
        console.error("Place Details Error:", error);
        return null;
    }
};

export const reverseGeocodeGoogle = async (lat, lng) => {
    if (!hasGoogleMapsKey()) return null;


    if (Platform.OS === 'web') {
        try {
            await loadGoogleMapsScript();
            return new Promise((resolve) => {
                const geocoder = new window.google.maps.Geocoder();
                geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        const first = results[0];
                        const findComp = (type) => first.address_components.find(c => c.types.includes(type))?.long_name;
                        resolve({
                            address: first.formatted_address,
                            street: findComp('route') || findComp('street_address'),
                            city: findComp('postal_town') || findComp('locality') || findComp('administrative_area_level_2'),
                            postalCode: findComp('postal_code')
                        });
                    } else {
                        resolve(null);
                    }
                });
            });
        } catch (e) {
            return null;
        }
    }

    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results.length > 0) {
            const first = data.results[0];

            const findComp = (type) => first.address_components.find(c => c.types.includes(type))?.long_name;

            return {
                address: first.formatted_address,
                street: findComp('route') || findComp('street_address'),
                city: findComp('postal_town') || findComp('locality') || findComp('administrative_area_level_2'),
                postalCode: findComp('postal_code')
            };
        }
        return null;
    } catch (error) {
        console.error("Reverse Geocode Error:", error);
        return null;
    }
};
