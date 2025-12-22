// HomeScreen.js — With Custom Modals & Functional Deletion
// Made by JN at studioFTR
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  ImageBackground,
  Modal,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { clearAllData } from '../utils/logManager';
import { getTokens, initializeTokens } from '../utils/tokenManager';
import RefillTokensModal from '../components/RefillTokensModal';

const bubbles = [
  { title: 'Find', screen: 'Find', icon: 'search' },
  { title: 'Log Item', screen: 'Log', icon: 'edit-2' },
  { title: 'Fix', screen: 'Fix', icon: 'tool' },
  { title: 'Flip', screen: 'Flip', icon: 'dollar-sign' },
  { title: 'My Finds', screen: 'MyFinds', icon: 'box' },
  { title: 'FlipBot', screen: 'FlipBot', icon: 'message-circle' },
];

export default function HomeScreen({ navigation }) {
  const { height, width } = useWindowDimensions();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [tokenCount, setTokenCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadTokenCount();
    }, [])
  );

  const loadTokenCount = async () => {
    await initializeTokens();
    const count = await getTokens();
    setTokenCount(count);
  };

  const buttonWidth = (width - 64) / 2; // 24px padding each side + 16px gap
  const buttonHeight = 110;

  const handleClearData = async () => {
    const success = await clearAllData();
    if (success) {
      setShowDeleteModal(false);
    }
  };

  const renderInfoModal = () => (
    <Modal
      visible={showInfoModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowInfoModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.infoCard}>
          <View style={styles.infoLogoContainer}>
            <Text style={styles.infoLogoText}>FlipHQ</Text>
            <View style={styles.infoLogoUnderline} />
          </View>
          
          <Text style={styles.infoVersion}>Version 1.2</Text>
          
          <View style={styles.infoDetails}>
            <Text style={styles.infoText}>The high-end tool for treasure-hunting hustlers.</Text>
            <View style={styles.infoDivider} />
            <Text style={styles.infoCredit}>Built by <Text style={{ color: '#FFD700', fontFamily: 'Poppins-SemiBold' }}>studioFTR</Text></Text>
          </View>

          <Pressable 
            style={styles.modalCloseBtn}
            onPress={() => setShowInfoModal(false)}
          >
            <Text style={styles.modalCloseBtnText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  const renderDeleteModal = () => (
    <Modal
      visible={showDeleteModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDeleteModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.infoCard, { borderColor: 'rgba(255, 68, 68, 0.3)' }]}>
          <View style={styles.deleteIconContainer}>
            <Feather name="alert-triangle" size={32} color="#ff4444" />
          </View>
          
          <Text style={styles.modalTitle}>Wipe History?</Text>
          <Text style={styles.modalSubtitle}>
            This will permanently delete all your inventory, leads, and search history. This cannot be undone.
          </Text>

          <View style={styles.modalActionRow}>
            <Pressable 
              style={[styles.modalBtn, styles.modalCancelBtn]}
              onPress={() => setShowDeleteModal(false)}
            >
              <Text style={styles.modalBtnText}>Keep Data</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.modalBtn, styles.modalConfirmBtn]}
              onPress={handleClearData}
            >
              <Text style={[styles.modalBtnText, { color: '#fff' }]}>Clear All</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <ImageBackground
      source={require('../assets/bg-gradient.jpg')}
      resizeMode="cover"
      style={styles.container}
    >
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          onPress={() => setShowInfoModal(true)}
          style={styles.headerButton}
        >
          <Feather name="info" size={20} color="#FFD700" />
        </Pressable>
        
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>FlipHQ</Text>
          <View style={styles.logoUnderline} />
          <Text style={styles.tagline}>From find to flip — in one place.</Text>
        </View>
        
        <Pressable 
          onPress={() => setShowDeleteModal(true)}
          style={styles.headerButton}
        >
          <Feather name="trash-2" size={20} color="#FFD700" />
        </Pressable>
      </View>

      {/* Main Content - Equally Spaced */}
      <View style={styles.content}>
        {/* Row 1 */}
        <View style={styles.buttonRow}>
          {[bubbles[0], bubbles[1]].map((bubble, idx) => (
            <Pressable
              key={bubble.title}
              onPress={() => navigation.navigate(bubble.screen)}
              style={({ pressed }) => [
                styles.buttonWrapper,
                { width: buttonWidth, marginRight: idx === 0 ? 16 : 0 },
                pressed && styles.buttonPressed,
              ]}
            >
              <View style={[styles.button, { height: buttonHeight }]}>
                <View style={styles.buttonContent}>
                  <View style={styles.buttonIconContainer}>
                    <Feather name={bubble.icon} size={24} color="#fff" />
                  </View>
                  <Text style={styles.buttonText}>{bubble.title}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Row 2 */}
        <View style={styles.buttonRow}>
          {[bubbles[2], bubbles[3]].map((bubble, idx) => (
            <Pressable
              key={bubble.title}
              onPress={() => navigation.navigate(bubble.screen)}
              style={({ pressed }) => [
                styles.buttonWrapper,
                { width: buttonWidth, marginRight: idx === 0 ? 16 : 0 },
                pressed && styles.buttonPressed,
              ]}
            >
              <View style={[styles.button, { height: buttonHeight }]}>
                <View style={styles.buttonContent}>
                  <View style={styles.buttonIconContainer}>
                    <Feather name={bubble.icon} size={24} color="#fff" />
                  </View>
                  <Text style={styles.buttonText}>{bubble.title}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Row 3 */}
        <View style={styles.buttonRow}>
          {[bubbles[4], bubbles[5]].map((bubble, idx) => (
            <Pressable
              key={bubble.title}
              onPress={() => navigation.navigate(bubble.screen)}
              style={({ pressed }) => [
                styles.buttonWrapper,
                { width: buttonWidth, marginRight: idx === 0 ? 16 : 0 },
                pressed && styles.buttonPressed,
              ]}
            >
              <View style={[styles.button, { height: buttonHeight }]}>
                <View style={styles.buttonContent}>
                  <View style={styles.buttonIconContainer}>
                    <Feather name={bubble.icon} size={24} color="#fff" />
                  </View>
                  <Text style={styles.buttonText}>{bubble.title}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Bottom Slim Buttons */}
      <View style={styles.bottomButtons}>
        <Pressable
          onPress={() => navigation.navigate('HowItWorks')}
          style={({ pressed }) => [
            styles.slimButton,
            pressed && styles.slimButtonPressed,
          ]}
        >
          <Text style={styles.slimButtonText}>How It Works</Text>
        </Pressable>

        <Pressable
          onPress={() => setShowRefillModal(true)}
          style={({ pressed }) => [
            styles.slimButton,
            pressed && styles.slimButtonPressed,
          ]}
        >
          <Text style={styles.slimButtonText}>Refill Tokens</Text>
          <View style={styles.tokenBadgeInButton}>
            <Feather name="zap" size={12} color="#FFD700" />
            <Text style={styles.tokenTextInButton}>{tokenCount}</Text>
          </View>
        </Pressable>
      </View>

      {renderInfoModal()}
      {renderDeleteModal()}
      <RefillTokensModal
        visible={showRefillModal}
        onClose={() => setShowRefillModal(false)}
        onTokensAdded={loadTokenCount}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 70,
    paddingBottom: 20,
    paddingHorizontal: 24,
    zIndex: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
  },
  logoContainer: {
    alignItems: 'center',
    flex: 1,
  },
  logoText: {
    fontSize: 30,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  logoUnderline: {
    width: 50,
    height: 2.5,
    backgroundColor: '#FFD700',
    marginTop: 6,
    borderRadius: 2,
  },
  tagline: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 14,
    letterSpacing: 0.3,
  },
  tokenBadgeInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  tokenTextInButton: {
    color: '#FFD700',
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    justifyContent: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  buttonWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.95,
  },
  button: {
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#003F91',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    position: 'relative',
    overflow: 'hidden',
  },
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  buttonIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },
  bottomButtons: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
  },
  slimButton: {
    height: 48,
    backgroundColor: '#003F91',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  slimButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  slimButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#001a35',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  infoLogoContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLogoText: {
    fontSize: 28,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
  },
  infoLogoUnderline: {
    width: 40,
    height: 2,
    backgroundColor: '#FFD700',
    marginTop: 4,
  },
  infoVersion: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    marginBottom: 24,
  },
  infoDetails: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  infoText: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
    lineHeight: 22,
  },
  infoDivider: {
    width: 20,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 16,
  },
  infoCredit: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
  },
  modalCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCloseBtnText: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  deleteIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalConfirmBtn: {
    backgroundColor: '#ff4444',
  },
  modalBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
