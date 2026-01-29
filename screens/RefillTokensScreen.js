// RefillTokensScreen.js — Full screen for IAP purchases
// Made by JN at studioFTR
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
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

export default function RefillTokensScreen({ navigation }) {
  const [currentTokens, setCurrentTokens] = useState(0);
  const [purchasing, setPurchasing] = useState(false);
  const [purchasingBundleId, setPurchasingBundleId] = useState(null);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const purchaseInProgressRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      loadTokenCount();
      initializeStore();
      // Reset purchasing state when screen focuses
      purchaseInProgressRef.current = false;
      setPurchasing(false);
      setPurchasingBundleId(null);
    }, [])
  );

  // Listen to purchase events - UI state reset ONLY via events
  useEffect(() => {
    const resetPurchasingState = () => {
      purchaseInProgressRef.current = false;
      setPurchasing(false);
      setPurchasingBundleId(null);
    };

    const successSubscription = iapEmitter.addListener('purchaseSuccess', ({ tokensAdded, alreadyProcessed }) => {
      resetPurchasingState();
      loadTokenCount();
      
      if (!alreadyProcessed && tokensAdded > 0) {
        Alert.alert('Success!', `You've received ${tokensAdded} tokens!`);
      }
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
    };
  }, []);

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
      
      if (__DEV__) {
        console.log('IAP: Loading products:', productIds);
      }
      
      const productsResponse = await InAppPurchases.getProductsAsync(productIds);
      
      if (!productsResponse) {
        if (__DEV__) {
          console.error('IAP: getProductsAsync returned null/undefined');
        }
        setProductsLoaded(false);
        setProducts([]);
        return [];
      }

      const { responseCode, results } = productsResponse;
      
      if (__DEV__) {
        console.log('IAP: getProductsAsync response:', { responseCode, resultsCount: results?.length });
      }
      
      if (responseCode === InAppPurchases.IAPResponseCode.OK && results && results.length > 0) {
        if (__DEV__) {
          console.log('IAP: Products loaded successfully:', results.map(p => ({ id: p.productId, price: p.price })));
        }
        setProducts(results);
        setProductsLoaded(true);
        return results;
      } else {
        if (__DEV__) {
          console.warn('IAP: Failed to load products:', { responseCode, resultsCount: results?.length });
        }
        setProductsLoaded(false);
        setProducts([]);
        return [];
      }
    } catch (error) {
      if (__DEV__) {
        console.error('IAP: Store initialization error:', error);
        console.error('IAP: Error details:', {
          message: error.message,
          code: error.code,
          stack: error.stack,
        });
      }
      setProductsLoaded(false);
      setProducts([]);
      return [];
    } finally {
      setLoadingProducts(false);
    }
  };

  const handlePurchase = async (bundle) => {
    if (purchasing || purchaseInProgressRef.current) {
      if (__DEV__) {
        console.warn('IAP: Purchase already in progress, ignoring tap');
      }
      return;
    }
    purchaseInProgressRef.current = true;

    if (__DEV__) {
      console.log('IAP: Starting purchase for bundle:', bundle.id);
    }

    // Load products if needed - use returned array to avoid race condition
    let availableProducts = products;
    if (!productsLoaded || products.length === 0) {
      if (__DEV__) {
        console.log('IAP: Products not loaded, initializing store...');
      }
      availableProducts = await initializeStore();
      
      if (!availableProducts || availableProducts.length === 0) {
        purchaseInProgressRef.current = false;
        const errorMsg = 'Failed to load products from store. Please check:\n\n1. Products are configured in App Store Connect\n2. Products are approved or ready to submit\n3. You are signed in with a sandbox account (TestFlight)\n4. Internet connection is active';
        if (__DEV__) {
          console.error('IAP: No products available after initialization');
        }
        Alert.alert('Purchase Failed', errorMsg);
        return;
      }
    }

    // Get product ID
    const productId = PRODUCT_IDS[bundle.id];
    if (!productId) {
      purchaseInProgressRef.current = false;
      if (__DEV__) {
        console.error('IAP: Product ID not found for bundle:', bundle.id);
      }
      Alert.alert('Purchase Failed', `Product ID not found for bundle: ${bundle.id}`);
      return;
    }

    // Find product
    const product = availableProducts.find(p => p.productId === productId);
    if (!product) {
      purchaseInProgressRef.current = false;
      if (__DEV__) {
        console.error('IAP: Product not found in store:', productId);
        console.error('IAP: Available products:', availableProducts.map(p => p.productId));
      }
      Alert.alert(
        'Purchase Failed', 
        `Product "${productId}" not found in store.\n\nPlease verify:\n1. Product ID matches App Store Connect exactly\n2. Product is approved or ready to submit\n3. You are testing with a sandbox account`
      );
      return;
    }

    if (__DEV__) {
      console.log('IAP: Product found:', { productId: product.productId, price: product.price });
    }

    // Set purchasing state (minimal - just for UI feedback)
    setPurchasing(true);
    setPurchasingBundleId(bundle.id);

    // CRITICAL: Call purchaseItemAsync WITHOUT await - fire and forget
    // Awaiting blocks JS thread and prevents StoreKit sheet from appearing
    if (__DEV__) {
      console.log('IAP: Calling purchaseItemAsync (fire-and-forget):', product.productId);
    }
    
    InAppPurchases.purchaseItemAsync(product.productId).catch((error) => {
      // Only handle if purchase fails to initiate (synchronous error)
      purchaseInProgressRef.current = false;
      setPurchasing(false);
      setPurchasingBundleId(null);
      
      if (__DEV__) {
        console.error('IAP: purchaseItemAsync initiation error:', error);
        console.error('IAP: Error details:', {
          message: error.message,
          code: error.code,
          name: error.name,
          stack: error.stack,
        });
      }
      
      const errorMsg = error.message || 'Unknown error';
      Alert.alert(
        'Purchase Failed', 
        `Unable to start purchase: ${errorMsg}\n\nPlease check:\n1. StoreKit connection is active\n2. Product is available\n3. Internet connection is stable`
      );
    });
    
    // UI state will reset ONLY via purchase listener events (success, error, cancel, deferred)
    // No timeout - let StoreKit handle the flow naturally
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <Feather name="arrow-left" size={scaleSize(24)} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle}>Refill Tokens</Text>
            <View style={styles.placeholder} />
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
              // Disable only if: product not available or products are currently loading or already purchasing
              const isDisabled = !productAvailable || loadingProducts || (purchasing && purchasingBundleId !== bundle.id);
              
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001f3f',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: scaleSize(24),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSize(24),
    paddingTop: scaleSize(20),
  },
  backButton: {
    padding: scaleSize(4),
  },
  headerTitle: {
    color: '#fff',
    fontSize: scaleFont(24),
    fontFamily: 'Poppins-SemiBold',
  },
  placeholder: {
    width: scaleSize(32),
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

