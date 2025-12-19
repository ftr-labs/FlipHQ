// FTR
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getTokens, addTokens } from '../utils/tokenManager';

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

  useFocusEffect(
    useCallback(() => {
      if (visible) {
        loadTokenCount();
      }
    }, [visible])
  );

  const loadTokenCount = async () => {
    const count = await getTokens();
    setCurrentTokens(count);
  };

  const handlePurchase = async (bundle) => {
    // TODO: Integrate IAP here before launch
    // For now, this is a placeholder that will be replaced with actual IAP
    console.log('Would purchase:', bundle.id);
    
    // Dev mode: Manually add tokens for testing
    // Remove this before launch
    await addTokens(bundle.tokens);
    await loadTokenCount();
    if (onTokensAdded) onTokensAdded();
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
                <Feather name="x" size={24} color="#fff" />
              </Pressable>
            </View>

            <View style={styles.currentTokensBox}>
              <Text style={styles.currentTokensLabel}>Current Tokens</Text>
              <View style={styles.tokenCountDisplay}>
                <Feather name="zap" size={20} color="#FFD700" />
                <Text style={styles.tokenCountText}>{currentTokens}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Choose a Bundle</Text>
            <View style={styles.bundlesContainer}>
              {BUNDLES.map((bundle) => (
                <Pressable
                  key={bundle.id}
                  style={styles.bundleCard}
                  onPress={() => handlePurchase(bundle)}
                >
                  {bundle.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>BEST VALUE</Text>
                    </View>
                  )}
                  <Text style={styles.bundleName}>{bundle.name}</Text>
                  <View style={styles.bundleTokens}>
                    <Feather name="zap" size={18} color="#FFD700" />
                    <Text style={styles.bundleTokensText}>{bundle.tokens} Tokens</Text>
                  </View>
                  <Text style={styles.bundlePrice}>{bundle.price}</Text>
                  <Text style={styles.bundleDescription}>{bundle.description}</Text>
                </Pressable>
              ))}
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
    maxWidth: 500,
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#001a35',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
  },
  closeButton: {
    padding: 4,
  },
  currentTokensBox: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  currentTokensLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  tokenCountDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tokenCountText: {
    color: '#FFD700',
    fontSize: 32,
    fontFamily: 'Poppins-SemiBold',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 16,
  },
  bundlesContainer: {
    gap: 12,
    marginBottom: 24,
  },
  bundleCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#001f3f',
    fontSize: 10,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 0.5,
  },
  bundleName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 8,
  },
  bundleTokens: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  bundleTokensText: {
    color: '#FFD700',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  bundlePrice: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 4,
  },
  bundleDescription: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
});

