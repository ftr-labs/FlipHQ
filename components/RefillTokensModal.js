// FTR
import React, { useState, useCallback } from 'react';
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
import { getTokens, addTokens } from '../utils/tokenManager';
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
  const [isConnected, setIsConnected] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (visible) {
        loadTokenCount();
        initializeStore();
      }
    }, [visible])
  );

  const loadTokenCount = async () => {
    const count = await getTokens();
    setCurrentTokens(count);
  };

  const initializeStore = async () => {
    try {
      // Connect to store if not already connected
      if (!isConnected) {
        try {
          await InAppPurchases.connectAsync();
          setIsConnected(true);
        } catch (error) {
          // Handle "already connected" error gracefully
          if (error.message && error.message.includes('already connected')) {
            setIsConnected(true);
          } else {
            if (__DEV__) {
              console.error('Failed to connect to store:', error);
            }
            return;
          }
        }
      }

      // Query products from store (required before purchase)
      if (!productsLoaded) {
        const productIds = Object.values(PRODUCT_IDS);
        const { responseCode, results } = await InAppPurchases.getProductsAsync(productIds);
        
        if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
          setProductsLoaded(true);
          if (__DEV__) {
            console.log('Products loaded:', results);
          }
        } else {
          if (__DEV__) {
            console.error('Failed to load products:', responseCode);
          }
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Store initialization error:', error);
      }
    }
  };

  const handlePurchase = async (bundle) => {
    if (purchasing) return; // Prevent multiple simultaneous purchases

    setPurchasing(true);
    setPurchasingBundleId(bundle.id);

    try {
      // Ensure store is initialized (connected + products queried)
      if (!isConnected || !productsLoaded) {
        await initializeStore();
        
        // Check again after initialization
        if (!isConnected) {
          throw new Error('Failed to connect to App Store.');
        }
        if (!productsLoaded) {
          throw new Error('Failed to load products from store. Please try again.');
        }
      }

      // Get the product ID for this bundle
      const productId = PRODUCT_IDS[bundle.id];

      if (!productId) {
        throw new Error(`Product ID not found for bundle: ${bundle.id}`);
      }

      // Purchase the product (products must be queried first)
      const { responseCode, results } = await InAppPurchases.purchaseItemAsync(productId);

      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        // Purchase successful
        const purchase = results[0];
        
        if (purchase) {
          // Add tokens to user's account
          await addTokens(bundle.tokens);
          await loadTokenCount();
          
          if (onTokensAdded) onTokensAdded();

          // Acknowledge the purchase (required for consumables)
          if (purchase.acknowledged === false) {
            await InAppPurchases.finishTransactionAsync(purchase, true);
          }

          Alert.alert('Success!', `You've received ${bundle.tokens} tokens!`);
        }
      } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
        // User canceled - no action needed
        if (__DEV__) {
          console.log('Purchase canceled by user');
        }
      } else if (responseCode === InAppPurchases.IAPResponseCode.DEFERRED) {
        // Purchase deferred (iOS only - family sharing)
        Alert.alert('Purchase Pending', 'Your purchase is pending approval.');
      } else {
        // Other error
        throw new Error(`Purchase failed with code: ${responseCode}`);
      }
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
            <View style={styles.bundlesContainer}>
              {BUNDLES.map((bundle) => {
                const isPurchasing = purchasing && purchasingBundleId === bundle.id;
                const isDisabled = purchasing && purchasingBundleId !== bundle.id;
                
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
});

