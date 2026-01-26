// FTR
import React, { useState, useCallback, useEffect } from 'react';
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
  const [products, setProducts] = useState([]); // Store actual Product objects from StoreKit
  const [loadingProducts, setLoadingProducts] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (visible) {
        loadTokenCount();
        initializeStore();
      }
    }, [visible])
  );

  // Listen for purchase success and deferred events from global listener
  useEffect(() => {
    const successSubscription = iapEmitter.addListener('purchaseSuccess', ({ tokensAdded }) => {
      // Reload token count to reflect the granted tokens
      loadTokenCount();
      
      // Show success message
      Alert.alert('Success!', `You've received ${tokensAdded} tokens!`);
      
      // Notify parent component
      if (onTokensAdded) onTokensAdded();
    });

    const deferredSubscription = iapEmitter.addListener('purchaseDeferred', ({ message }) => {
      // Show deferred message
      Alert.alert('Purchase Pending', message || 'Your purchase is pending approval. You will receive tokens once approved.');
    });

    return () => {
      successSubscription.remove();
      deferredSubscription.remove();
    };
  }, [onTokensAdded]);

  const loadTokenCount = async () => {
    const count = await getTokens();
    setCurrentTokens(count);
  };

  const initializeStore = async () => {
    // Don't re-fetch if already loaded
    if (productsLoaded && products.length > 0) {
      return products;
    }
    
    setLoadingProducts(true);
    try {
      // Store connection is handled globally in App.js
      // We can query products directly - if not connected, getProductsAsync will fail

      // Query products from store (required before purchase)
      const productIds = Object.values(PRODUCT_IDS);
      const productsResponse = await InAppPurchases.getProductsAsync(productIds);
      
      // Check if response exists
      if (!productsResponse) {
        if (__DEV__) {
          console.error('getProductsAsync returned no response');
        }
        setProductsLoaded(false);
        setProducts([]);
        return [];
      }

      const { responseCode, results } = productsResponse;
      
      if (responseCode === InAppPurchases.IAPResponseCode.OK && results && results.length > 0) {
        // Store the actual Product objects returned from StoreKit
        setProducts(results);
        setProductsLoaded(true);
        if (__DEV__) {
          console.log('Products loaded:', results);
        }
        return results;
      } else {
        if (__DEV__) {
          console.error('Failed to load products:', responseCode, results);
        }
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
    if (purchasing) return; // Prevent multiple simultaneous purchases

    setPurchasing(true);
    setPurchasingBundleId(bundle.id);

    try {
      // Ensure products are loaded before purchase
      // Get products directly from initializeStore to avoid state timing issues
      let availableProducts = products;
      if (!productsLoaded || products.length === 0) {
        availableProducts = await initializeStore();
        
        // Check if products loaded successfully
        if (!availableProducts || availableProducts.length === 0) {
          throw new Error('Failed to load products from store. Please try again.');
        }
      }

      // Get the product ID for this bundle
      const productId = PRODUCT_IDS[bundle.id];

      if (!productId) {
        throw new Error(`Product ID not found for bundle: ${bundle.id}`);
      }

      // CRITICAL: Find the actual Product object returned by StoreKit
      // We can only purchase products that were successfully returned from getProductsAsync()
      const product = availableProducts.find(p => p.productId === productId);

      if (!product) {
        throw new Error(`Product "${productId}" not found in store. It may not be available or configured correctly.`);
      }

      // Purchase using the actual Product object (or productId from verified product)
      // NOTE: purchaseItemAsync returns Promise<void> - purchase results are delivered
      // asynchronously via the global purchase listener in App.js, NOT as a return value
      await InAppPurchases.purchaseItemAsync(product.productId);
      
      // Purchase has been triggered - the global listener in App.js will handle:
      // - Granting tokens based on product ID
      // - Finishing the transaction
      // - Emitting 'purchaseSuccess' event for UI updates
      // - All purchase result codes (OK, USER_CANCELED, DEFERRED, ERROR)
      
      // No success handling here - all handled by listener via event emitter
    } catch (error) {
      if (__DEV__) {
        console.error('Purchase error:', error);
      }
      // Provide user-friendly error messages
      let errorMessage = 'Unable to complete purchase. Please try again.';
      if (error.message) {
        if (error.message.includes('already connected')) {
          errorMessage = 'Please try your purchase again.';
        } else {
          errorMessage = error.message;
        }
      }
      Alert.alert(
        'Purchase Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setPurchasing(false);
      setPurchasingBundleId(null);
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
                // Disable if: purchasing another item, products not loaded, or this product not available
                const isDisabled = purchasing || !productsLoaded || !productAvailable || loadingProducts;
                
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

