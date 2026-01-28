// FTR
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  SafeAreaView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as InAppPurchases from 'expo-in-app-purchases';
import { getTokens } from '../utils/tokenManager';
import { iapEmitter } from '../utils/iapEvents';
import { scaleFont, scaleSize, getResponsiveValue } from '../utils/responsive';

// Product ID mapping for iOS and Android
const PRODUCT_IDS = {
  starter: Platform.OS === 'ios' ? 'com.flipworthy.starterpack' : 'starter_pack',
  hustler: Platform.OS === 'ios' ? 'com.flipworthy.hustlerpack' : 'hustler_pack',
  pro: Platform.OS === 'ios' ? 'com.flipworthy.propack' : 'pro_pack',
};

const BUNDLES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    tokens: 10,
    price: '$0.99',
    description: 'Quick refill',
  },
  {
    id: 'hustler',
    name: 'Hustler Pack',
    tokens: 35,
    price: '$2.99',
    description: 'Best value',
    badge: true,
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    tokens: 80,
    price: '$4.99',
    description: 'Maximum hustle',
  },
];

export default function RefillTokensModal({ visible, onClose, onTokensAdded }) {
  const [currentTokens, setCurrentTokens] = useState(0);
  const [purchasing, setPurchasing] = useState(false);
  const [purchasingBundleId, setPurchasingBundleId] = useState(null);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const safetyTimeoutRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      if (visible) {
        loadTokenCount();
        initializeStore();
      }
    }, [visible])
  );

  // Listen to purchase events - UI state reset ONLY via events
  useEffect(() => {
    const clearSafetyTimeout = () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
    };

    const resetPurchasingState = () => {
      clearSafetyTimeout();
      setPurchasing(false);
      setPurchasingBundleId(null);
    };

    const successSubscription = iapEmitter.addListener('purchaseSuccess', ({ tokensAdded, alreadyProcessed }) => {
      resetPurchasingState();
      loadTokenCount();
      
      if (!alreadyProcessed && tokensAdded > 0) {
        Alert.alert('Success!', `You've received ${tokensAdded} tokens!`);
      }
      
      if (onTokensAdded) onTokensAdded();
    });

    const deferredSubscription = iapEmitter.addListener('purchaseDeferred', ({ message }) => {
      resetPurchasingState();
      Alert.alert('Purchase Pending', message || 'Your purchase is pending approval. You will receive tokens once approved.');
    });

    const errorSubscription = iapEmitter.addListener('purchaseError', ({ error, type }) => {
      resetPurchasingState();
      
      if (type === 'storekit_error') {
        Alert.alert('Purchase Failed', error || 'Unable to complete purchase. Please try again.');
      }
    });

    const canceledSubscription = iapEmitter.addListener('purchaseCanceled', () => {
      resetPurchasingState();
    });

    return () => {
      successSubscription.remove();
      deferredSubscription.remove();
      errorSubscription.remove();
      canceledSubscription.remove();
      clearSafetyTimeout();
    };
  }, [onTokensAdded]);

  const loadTokenCount = async () => {
    const count = await getTokens();
    setCurrentTokens(count);
  };

  const initializeStore = async () => {
    if (productsLoaded && products.length > 0) {
      return products;
    }
    
    setLoadingProducts(true);
    try {
      const productIds = Object.values(PRODUCT_IDS);
      const productsResponse = await InAppPurchases.getProductsAsync(productIds);
      
      if (!productsResponse) {
        setProductsLoaded(false);
        setProducts([]);
        return [];
      }

      const { responseCode, results } = productsResponse;
      
      if (responseCode === InAppPurchases.IAPResponseCode.OK && results && results.length > 0) {
        setProducts(results);
        setProductsLoaded(true);
        return results;
      } else {
        setProductsLoaded(false);
        setProducts([]);
        return [];
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Store initialization error:', error);
      }
      setProductsLoaded(false);
      setProducts([]);
      return [];
    } finally {
      setLoadingProducts(false);
    }
  };

  const handlePurchase = async (bundle) => {
    if (purchasing) return;

    try {
      // Load products if needed - use returned array to avoid race condition
      let availableProducts = products;
      if (!productsLoaded || products.length === 0) {
        availableProducts = await initializeStore();
        
        if (!availableProducts || availableProducts.length === 0) {
          Alert.alert('Purchase Failed', 'Failed to load products from store. Please try again.');
          return;
        }
      }

      // Get product ID
      const productId = PRODUCT_IDS[bundle.id];
      if (!productId) {
        Alert.alert('Purchase Failed', `Product ID not found for bundle: ${bundle.id}`);
        return;
      }

      // Find product
      const product = availableProducts.find(p => p.productId === productId);
      if (!product) {
        Alert.alert('Purchase Failed', `Product "${productId}" not found in store.`);
        return;
      }

      // CRITICAL: Call purchaseItemAsync IMMEDIATELY, BEFORE UI state changes
      try {
        await InAppPurchases.purchaseItemAsync(product.productId);
      } catch (initError) {
        // Purchase failed to initiate
        Alert.alert('Purchase Failed', 'Unable to start purchase. Please try again.');
        return;
      }

      // THEN set processing UI state
      setPurchasing(true);
      setPurchasingBundleId(bundle.id);
      
      // Safety timeout: Reset UI if StoreKit never responds (15-20s)
      // This ONLY unlocks UI, does NOT grant tokens or show success
      safetyTimeoutRef.current = setTimeout(() => {
        if (__DEV__) {
          console.warn('IAP: Safety timeout - StoreKit did not respond, resetting UI state');
        }
        setPurchasing(false);
        setPurchasingBundleId(null);
        safetyTimeoutRef.current = null;
      }, 18000); // 18 seconds
      
      // UI state will reset via purchase listener events (which clear this timeout)
    } catch (error) {
      if (__DEV__) {
        console.error('Purchase error:', error);
      }
      Alert.alert('Purchase Failed', 'Unable to complete purchase. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Refill Tokens</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={scaleSize(24)} color="#fff" />
              </Pressable>
            </View>

            <View style={styles.currentTokensBox}>
              <Text style={styles.currentTokensLabel}>Current Tokens</Text>
              <View style={styles.tokenCountDisplay}>
                <Feather name="zap" size={scaleSize(20)} color="#FFD700" />
                <Text style={styles.tokenCountText}>{currentTokens}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Choose a Bundle</Text>
            {loadingProducts && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#FFD700" />
                <Text style={styles.loadingText}>Loading products...</Text>
              </View>
            )}
            <View style={styles.bundlesContainer}>
              {BUNDLES.map((bundle) => {
                const isPurchasing = purchasing && purchasingBundleId === bundle.id;
                const productId = PRODUCT_IDS[bundle.id];
                const productAvailable = products.some(p => p.productId === productId);
                // Disable only if: product not available or products are currently loading
                const isDisabled = !productAvailable || loadingProducts;
                
                return (
                  <Pressable
                    key={bundle.id}
                    style={[
                      styles.bundleCard,
                      isDisabled && styles.bundleCardDisabled,
                    ]}
                    onPress={() => handlePurchase(bundle)}
                    disabled={isDisabled}
                  >
                    {bundle.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>BEST VALUE</Text>
                      </View>
                    )}
                    <Text style={styles.bundleName}>{bundle.name}</Text>
                    <View style={styles.bundleTokens}>
                      <Feather name="zap" size={scaleSize(18)} color="#FFD700" />
                      <Text style={styles.bundleTokensText}>{bundle.tokens} Tokens</Text>
                    </View>
                    <Text style={styles.bundlePrice}>{bundle.price}</Text>
                    <Text style={styles.bundleDescription}>{bundle.description}</Text>
                    {isPurchasing && (
                      <View style={styles.purchasingOverlay}>
                        <ActivityIndicator size="small" color="#FFD700" />
                        <Text style={styles.purchasingText}>Processing...</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: getResponsiveValue(scaleSize(340), scaleSize(400), scaleSize(500)),
    padding: scaleSize(24),
  },
  modalContent: {
    backgroundColor: '#001a35',
    borderRadius: scaleSize(24),
    padding: scaleSize(24),
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSize(24),
  },
  modalTitle: {
    color: '#fff',
    fontSize: scaleFont(24),
    fontFamily: 'Poppins-SemiBold',
  },
  closeButton: {
    padding: scaleSize(4),
  },
  currentTokensBox: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: scaleSize(16),
    padding: scaleSize(20),
    alignItems: 'center',
    marginBottom: scaleSize(24),
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  currentTokensLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: scaleFont(12),
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'uppercase',
    marginBottom: scaleSize(8),
  },
  tokenCountDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSize(8),
  },
  tokenCountText: {
    color: '#FFD700',
    fontSize: scaleFont(32),
    fontFamily: 'Poppins-SemiBold',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: scaleFont(16),
    fontFamily: 'Poppins-SemiBold',
    marginBottom: scaleSize(16),
  },
  bundlesContainer: {
    gap: scaleSize(12),
    marginBottom: scaleSize(24),
  },
  bundleCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: scaleSize(16),
    padding: scaleSize(14),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: scaleSize(-8),
    right: scaleSize(16),
    backgroundColor: '#FFD700',
    paddingHorizontal: scaleSize(12),
    paddingVertical: scaleSize(4),
    borderRadius: scaleSize(8),
  },
  badgeText: {
    color: '#001f3f',
    fontSize: scaleFont(10),
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 0.5,
  },
  bundleName: {
    color: '#fff',
    fontSize: scaleFont(16),
    fontFamily: 'Poppins-SemiBold',
    marginBottom: scaleSize(8),
  },
  bundleTokens: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSize(8),
    marginBottom: scaleSize(6),
  },
  bundleTokensText: {
    color: '#FFD700',
    fontSize: scaleFont(14),
    fontFamily: 'Poppins-SemiBold',
  },
  bundlePrice: {
    color: '#fff',
    fontSize: scaleFont(20),
    fontFamily: 'Poppins-SemiBold',
    marginBottom: scaleSize(4),
  },
  bundleDescription: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: scaleFont(12),
    fontFamily: 'Poppins-Regular',
  },
  bundleCardDisabled: {
    opacity: 0.5,
  },
  purchasingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: scaleSize(16),
    justifyContent: 'center',
    alignItems: 'center',
    gap: scaleSize(8),
  },
  purchasingText: {
    color: '#FFD700',
    fontSize: scaleFont(12),
    fontFamily: 'Poppins-SemiBold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaleSize(8),
    padding: scaleSize(16),
    marginBottom: scaleSize(16),
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: scaleFont(14),
    fontFamily: 'Poppins-Regular',
  },
});

