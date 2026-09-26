import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  FlatList,
  Linking,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';

import { SUPABASE_FUNCTIONS_URL, APP_SHARED_SECRET } from '@env';
import {
  saveSavedSpot,
  getSavedSpots,
  removeSavedSpot,
  saveSearchCache,
  getSearchCache
} from '../utils/logManager';
import { placesRateLimiter } from '../utils/rateLimiter';
import { getDeviceId } from '../utils/deviceId';
import { scaleFont, scaleSize } from '../utils/responsive';

const PLACES_API_URL = `${SUPABASE_FUNCTIONS_URL}/places-proxy`;

export default function FindScreen({ navigation }) {
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [interested, setInterested] = useState({});
  const [message, setMessage] = useState('');

  // Load initial data
  useEffect(() => {
    requestPermission();
    loadCachedData();
  }, []);

  // Refresh "Interested" state when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSavedSpots();
    }, [])
  );

  const loadCachedData = async () => {
    const cached = await getSearchCache();
    if (cached) {
      setResults(cached);
    }
    await loadSavedSpots();
  };

  const loadSavedSpots = async () => {
    const saved = await getSavedSpots();
    const interestedMap = {};
    saved.forEach(spot => {
      interestedMap[spot.id] = true;
    });
    setInterested(interestedMap);
  };

  const requestPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
    } catch (e) {
      setPermissionStatus('denied');
    }
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleInterested = async (item) => {
    const isCurrentlyInterested = interested[item.id];
    
    if (isCurrentlyInterested) {
      await removeSavedSpot(item.id);
    } else {
      await saveSavedSpot(item);
    }

    setInterested((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
  };

  const openInMaps = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url);
  };

  const scanArea = async () => {
    if (permissionStatus !== 'granted') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      if (status !== 'granted') {
        setMessage('Location permission denied.');
        return;
      }
    }

    setLoading(true);
    setMessage('');

    try {
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;

      // Rate limiting: soft client-side throttle (the real cap lives server-side)
      if (!placesRateLimiter.canMakeRequest()) {
        const waitTime = placesRateLimiter.getTimeUntilNextRequest();
        if (waitTime > 0) {
          throw new Error(`Please wait ${Math.ceil(waitTime / 1000)} seconds before scanning again.`);
        }
      }

      placesRateLimiter.recordRequest();
      const deviceId = await getDeviceId();

      // Add timeout to prevent hanging requests
      const PLACES_API_TIMEOUT_MS = 30000; // 30 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timeout - please check your connection'));
        }, PLACES_API_TIMEOUT_MS);
      });

      const fetchPromise = fetch(PLACES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-secret': APP_SHARED_SECRET,
        },
        body: JSON.stringify({ deviceId, latitude, longitude }),
      });
      const resp = await Promise.race([fetchPromise, timeoutPromise]);
      const data = await resp.json();

      if (data.status === 'OVER_LIMIT') {
        setMessage(data.message || "You've hit today's scan limit — try again tomorrow.");
        return;
      }

      if (data.status !== 'OK') {
        if (__DEV__) {
          console.log('Places API Error:', data.status, data.error_message);
        }
        setMessage(`Google Places Error: ${data.status}`);
        return;
      }

      // Helper to calculate distance in km
      const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
      };

      const deg2rad = (deg) => deg * (Math.PI / 180);

      const places = (data.results || []).map((p) => {
        const dist = calculateDistance(
          latitude,
          longitude,
          p.geometry?.location?.lat,
          p.geometry?.location?.lng
        );
        return {
          id: p.place_id,
          name: p.name,
          address: p.vicinity,
          lat: p.geometry?.location?.lat,
          lng: p.geometry?.location?.lng,
          distance: dist,
        };
      });

      // Sort by distance
      places.sort((a, b) => a.distance - b.distance);

      const finalResults = places.slice(0, 15);
      setResults(finalResults);
      await saveSearchCache(finalResults);

      if (finalResults.length === 0) {
        setMessage('Nothing found nearby. Try scanning again later.');
      }
    } catch (e) {
      if (__DEV__) {
        console.log('API fetch failed:', e.message);
      }
      // Provide user-friendly error message
      let errorMessage = 'Failed to fetch spots.';
      if (e.message && e.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (e.message && (e.message.includes('network') || e.message.includes('fetch'))) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const expanded = expandedIds.has(item.id);
    const distMiles = (item.distance * 0.621371).toFixed(1);

    return (
      <Pressable
        onPress={() => toggleExpand(item.id)}
        style={({ pressed }) => [
          styles.card,
          expanded && styles.cardExpanded,
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIconContainer}>
            <Feather name="map-pin" size={scaleSize(18)} color="#FFD700" />
          </View>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.distanceText}>{distMiles} miles away</Text>
          </View>
          <Feather 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={scaleSize(20)} 
            color="rgba(255,255,255,0.4)" 
          />
        </View>
        
        {expanded && (
          <View style={styles.cardBody}>
            <View style={styles.divider} />
            <Text style={styles.address}>{item.address}</Text>
            
            <View style={styles.actionRow}>
              <Pressable onPress={() => openInMaps(item.lat, item.lng)} style={styles.mapLink}>
                <Feather name="navigation" size={scaleSize(14)} color="#001f3f" />
                <Text style={styles.mapLinkText}>Open Maps</Text>
              </Pressable>
              
              <Pressable
                onPress={() => toggleInterested(item)}
                style={[styles.interested, interested[item.id] && styles.interestedActive]}
              >
                <Feather
                  name={interested[item.id] ? 'check-square' : 'square'}
                  size={scaleSize(16)}
                  color={interested[item.id] ? '#001f3f' : '#FFD700'}
                  style={{ marginRight: scaleSize(6) }}
                />
                <Text style={[styles.interestedText, interested[item.id] && styles.interestedTextActive]}>
                  Interested
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={scaleSize(24)} color="#FFD700" />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Flip Spots</Text>
          <Text 
            style={styles.disclaimer}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.7}
          >
            Searches within a 25min drive
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable 
            onPress={scanArea} 
            style={({ pressed }) => [
              styles.scanBtn, 
              loading && styles.scanBtnDisabled,
              pressed && { opacity: 0.8 }
            ]}
            disabled={loading}
          > 
            <Feather name="refresh-cw" size={scaleSize(16)} color="#001f3f" />
          </Pressable>
        </View>
      </View>

      {loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loaderText}>Scanning area for gems...</Text>
        </View>
      )}

      {!loading && results.length === 0 && message !== '' && (
        <View style={styles.emptyContainer}>
          <Feather name="search" size={scaleSize(48)} color="rgba(255,255,255,0.1)" />
          <Text style={styles.message}>{message}</Text>
        </View>
      )}

      {!loading && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001f3f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: scaleSize(60),
    paddingBottom: scaleSize(20),
    paddingHorizontal: scaleSize(24),
  },
  backButton: {
    padding: scaleSize(4),
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: scaleSize(8),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSize(12),
  },
  title: {
    color: '#fff',
    fontSize: scaleFont(24),
    fontFamily: 'Poppins-SemiBold',
  },
  disclaimer: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: scaleFont(12),
    fontFamily: 'Poppins-Regular',
    marginTop: scaleSize(2),
  },
  scanBtn: {
    width: scaleSize(40),
    height: scaleSize(40),
    borderRadius: scaleSize(20),
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  scanBtnDisabled: {
    opacity: 0.5,
  },
  listContent: {
    paddingHorizontal: scaleSize(24),
    paddingTop: scaleSize(10),
    paddingBottom: scaleSize(100),
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    color: '#ccc',
    fontFamily: 'Poppins-Regular',
    fontSize: scaleFont(15),
    marginTop: scaleSize(16),
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleSize(40),
  },
  message: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Poppins-Regular',
    fontSize: scaleFont(15),
    marginTop: scaleSize(16),
    textAlign: 'center',
    lineHeight: scaleSize(22),
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: scaleSize(18),
    padding: scaleSize(16),
    marginBottom: scaleSize(16),
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
  },
  cardExpanded: {
    borderColor: 'rgba(255,215,0,0.4)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconContainer: {
    width: scaleSize(40),
    height: scaleSize(40),
    borderRadius: scaleSize(20),
    backgroundColor: 'rgba(255,215,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleSize(12),
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    color: '#fff',
    fontSize: scaleFont(16),
    fontFamily: 'Poppins-SemiBold',
  },
  distanceText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: scaleFont(12),
    fontFamily: 'Poppins-Regular',
    marginTop: scaleSize(2),
  },
  cardBody: {
    marginTop: scaleSize(16),
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: scaleSize(16),
  },
  address: {
    color: '#ccc',
    fontFamily: 'Poppins-Regular',
    fontSize: scaleFont(14),
    lineHeight: scaleSize(20),
    marginBottom: scaleSize(16),
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scaleSize(12),
  },
  mapLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: scaleSize(10),
    borderRadius: scaleSize(10),
  },
  mapLinkText: {
    color: '#001f3f',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(13),
    marginLeft: scaleSize(6),
  },
  interested: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
    paddingVertical: scaleSize(10),
    borderRadius: scaleSize(10),
  },
  interestedActive: {
    backgroundColor: '#FFD700',
  },
  interestedText: {
    color: '#FFD700',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(13),
  },
  interestedTextActive: {
    color: '#001f3f',
  },
});
