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

import { GOOGLE_PLACES_API_KEY } from '@env';
import { 
  saveSavedSpot, 
  getSavedSpots, 
  removeSavedSpot, 
  saveSearchCache, 
  getSearchCache 
} from '../utils/logManager';
import { getTokens, deductToken, refundToken, initializeTokens } from '../utils/tokenManager';

export default function FindScreen({ navigation }) {
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [interested, setInterested] = useState({});
  const [message, setMessage] = useState('');
  const [tokenCount, setTokenCount] = useState(0);
  const [showOutOfTokens, setShowOutOfTokens] = useState(false);

  // Load initial data
  useEffect(() => {
    requestPermission();
    loadCachedData();
  }, []);

  // Refresh "Interested" state when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSavedSpots();
      loadTokenCount();
    }, [])
  );

  const loadTokenCount = async () => {
    await initializeTokens();
    const count = await getTokens();
    setTokenCount(count);
    setShowOutOfTokens(count === 0 && results.length === 0);
  };

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
    // Check tokens first
    const currentTokens = await getTokens();
    if (currentTokens < 1) {
      setShowOutOfTokens(true);
      setMessage('You need tokens to scan for spots.');
      return;
    }

    if (permissionStatus !== 'granted') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      if (status !== 'granted') {
        setMessage('Location permission denied.');
        return;
      }
    }

    // Deduct token before API call
    const deducted = await deductToken();
    if (!deducted) {
      setShowOutOfTokens(true);
      setMessage('You need tokens to scan for spots.');
      await loadTokenCount();
      return;
    }

    await loadTokenCount(); // Update display

    setLoading(true);
    setMessage('');
    let tokenRefunded = false;

    try {
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;

      const keywords = 'thrift store|garage sale|flea market|secondhand|pawn shop|antique store|estate sale|consignment|charity shop|goodwill|salvage yard|vintage store|rummage sale|surplus store|liquidation';
      const url =
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json' +
        `?keyword=${encodeURIComponent(keywords)}` +
        `&location=${latitude},${longitude}` +
        '&radius=19312' + // 12 miles
        `&key=${GOOGLE_PLACES_API_KEY}`;

      if (__DEV__) {
        console.log('Request URL:', url);
      }

      const resp = await fetch(url);
      const data = await resp.json();

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

      // Safety check: Refund token if no results
      if (finalResults.length === 0) {
        await refundToken();
        tokenRefunded = true;
        await loadTokenCount();
        setMessage(
          'Nothing found nearby. Token refunded — try scanning again later.'
        );
      } else {
        setShowOutOfTokens(false);
      }
    } catch (e) {
      if (__DEV__) {
        console.log('API fetch failed:', e.message);
      }
      // Refund token on error
      if (!tokenRefunded) {
        await refundToken();
        await loadTokenCount();
      }
      setMessage('Failed to fetch spots. Token refunded.');
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
            <Feather name="map-pin" size={18} color="#FFD700" />
          </View>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.distanceText}>{distMiles} miles away</Text>
          </View>
          <Feather 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="rgba(255,255,255,0.4)" 
          />
        </View>
        
        {expanded && (
          <View style={styles.cardBody}>
            <View style={styles.divider} />
            <Text style={styles.address}>{item.address}</Text>
            
            <View style={styles.actionRow}>
              <Pressable onPress={() => openInMaps(item.lat, item.lng)} style={styles.mapLink}>
                <Feather name="navigation" size={14} color="#001f3f" />
                <Text style={styles.mapLinkText}>Open Maps</Text>
              </Pressable>
              
              <Pressable
                onPress={() => toggleInterested(item)}
                style={[styles.interested, interested[item.id] && styles.interestedActive]}
              >
                <Feather
                  name={interested[item.id] ? 'check-square' : 'square'}
                  size={16}
                  color={interested[item.id] ? '#001f3f' : '#FFD700'}
                  style={{ marginRight: 6 }}
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
          <Feather name="arrow-left" size={24} color="#FFD700" />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Flip Spots</Text>
          <Text style={styles.disclaimer}>Searches within a 25min drive</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.tokenBadge}>
            <Feather name="zap" size={14} color="#FFD700" />
            <Text style={styles.tokenText}>{tokenCount}</Text>
          </View>
          <Pressable 
            onPress={scanArea} 
            style={({ pressed }) => [
              styles.scanBtn, 
              loading && styles.scanBtnDisabled,
              pressed && { opacity: 0.8 }
            ]}
            disabled={loading}
          > 
            <Feather name="refresh-cw" size={16} color="#001f3f" />
          </Pressable>
        </View>
      </View>

      {loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loaderText}>Scanning area for gems...</Text>
        </View>
      )}

      {showOutOfTokens && !loading && results.length === 0 && (
        <View style={styles.emptyContainer}>
          <Feather name="zap" size={48} color="rgba(255,215,0,0.3)" />
          <Text style={styles.outOfTokensTitle}>Out of Tokens</Text>
          <Text style={styles.message}>
            You need tokens to scan for spots. Each scan costs 1 token.
          </Text>
          <Pressable
            style={styles.refillButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.refillButtonText}>Refill Tokens</Text>
          </Pressable>
        </View>
      )}

      {!loading && !showOutOfTokens && results.length === 0 && message !== '' && (
        <View style={styles.emptyContainer}>
          <Feather name="search" size={48} color="rgba(255,255,255,0.1)" />
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
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tokenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    gap: 6,
  },
  tokenText: {
    color: '#FFD700',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
  },
  disclaimer: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
  },
  scanBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 100,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    color: '#ccc',
    fontFamily: 'Poppins-Regular',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  message: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  outOfTokensTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    marginTop: 20,
    marginBottom: 8,
  },
  refillButton: {
    marginTop: 24,
    backgroundColor: '#FFD700',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  refillButtonText: {
    color: '#001f3f',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,215,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  distanceText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
  },
  cardBody: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  address: {
    color: '#ccc',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  mapLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 10,
    borderRadius: 10,
  },
  mapLinkText: {
    color: '#001f3f',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
    marginLeft: 6,
  },
  interested: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
    paddingVertical: 10,
    borderRadius: 10,
  },
  interestedActive: {
    backgroundColor: '#FFD700',
  },
  interestedText: {
    color: '#FFD700',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
  },
  interestedTextActive: {
    color: '#001f3f',
  },
});
