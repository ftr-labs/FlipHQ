// HomeScreen.js — Bento redesign
// Made by JN at studioFTR
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ImageBackground,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { clearAllData, getLoggedItems } from '../utils/logManager';
import { valuationForItem } from '../utils/valuation';
import { scaleFont, scaleSize, getResponsiveValue } from '../utils/responsive';

const HUES = {
  blue: '#1E90FF',
  pink: '#FF69B4',
  green: '#32CD32',
  gold: '#FFD700',
  purple: '#9370DB',
};

const getItemProfit = (item) => {
  if (item.status !== 'Flipped') return 0;
  const val = valuationForItem(item);
  const fixCost = item.fixCost !== undefined ? item.fixCost : val.fixCost;
  const acquisitionCost = item.acquisitionCost || 0;
  const sellPrice = item.sellPrice || 0;
  return sellPrice - acquisitionCost - fixCost;
};

export default function HomeScreen({ navigation }) {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [totalProfit, setTotalProfit] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);

  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(3600),
      ])
    );
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    shimmerLoop.start();
    breatheLoop.start();
    return () => {
      shimmerLoop.stop();
      breatheLoop.stop();
    };
  }, [shimmerAnim, breatheAnim]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        const items = await getLoggedItems();
        if (!isActive) return;
        const profit = items.reduce((sum, item) => sum + getItemProfit(item), 0);
        const inProgress = items.filter((item) => item.status !== 'Flipped').length;
        setTotalProfit(profit);
        setInProgressCount(inProgress);
      })();
      return () => {
        isActive = false;
      };
    }, [])
  );

  const handleClearData = async () => {
    const success = await clearAllData();
    if (success) {
      setShowDeleteModal(false);
    }
  };

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [scaleSize(-140), scaleSize(320)],
  });

  const glowShadowOpacity = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.65],
  });

  const renderInfoModal = () => (
    <Modal
      visible={showInfoModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowInfoModal(false)}
    >
      <Pressable style={styles.modalOverlay} onPress={() => setShowInfoModal(false)}>
        <Pressable style={styles.infoCard} onPress={() => {}}>
          <View style={styles.modalHead}>
            <Pressable
              style={styles.modalCloseIcon}
              onPress={() => setShowInfoModal(false)}
              hitSlop={10}
            >
              <Feather name="x" size={scaleSize(14)} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.infoMetaSection}>
            <Text style={styles.infoMeta}>
              <Text style={{ fontFamily: 'Poppins-SemiBold', color: '#fff' }}>FlipHQ</Text> — built by studioFTR
            </Text>
            <Text style={styles.infoMeta}>Version 1.2</Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoDataSection}>
            <Text style={styles.infoLabel}>Your Data</Text>
            <Text style={styles.infoText}>
              No accounts. No ads. Your inventory, finds, and history stay privately on your phone. To answer you, FlipBot, Log, and Find send only what you type or where you are — we never store it or link it to you.
            </Text>
          </View>

          <View style={styles.infoDivider} />

          <Pressable
            style={styles.wipeBtn}
            onPress={() => {
              setShowInfoModal(false);
              setShowDeleteModal(true);
            }}
          >
            <Text style={styles.wipeBtnText}>Wipe All Data</Text>
          </Pressable>
        </Pressable>
      </Pressable>
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
        <View style={[styles.infoCard, { borderColor: 'rgba(255, 68, 68, 0.3)', alignItems: 'center' }]}>
          <View style={styles.deleteIconContainer}>
            <Feather name="alert-triangle" size={scaleSize(32)} color="#ff4444" />
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

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.wordmark}>
            <Text style={styles.wordmarkFlip}>Flip</Text>
            <Text style={styles.wordmarkHQ}>HQ</Text>
          </View>
          <Pressable
            onPress={() => setShowInfoModal(true)}
            style={styles.infoBtn}
            hitSlop={8}
          >
            <Feather name="settings" size={scaleSize(16)} color="#FFD700" />
          </Pressable>
        </View>

        {/* Ledger */}
        <View style={styles.ledger}>
          <View>
            <Text style={styles.ledgerLabel}>Total Profit</Text>
            <Text style={styles.ledgerHeroValue}>
              {totalProfit < 0 ? `-$${Math.abs(totalProfit)}` : `$${totalProfit}`}
            </Text>
          </View>
          <Text style={styles.ledgerSub}>
            <Text style={styles.ledgerSubBold}>{inProgressCount}</Text> in progress
          </Text>
        </View>

        {/* Bento grid */}
        <View style={styles.bento}>
          {/* Hero: Log Item */}
          <Pressable
            onPress={() => navigation.navigate('Log')}
            style={({ pressed }) => [pressed && styles.tilePressed]}
          >
            <Animated.View style={[styles.heroShadowWrap, { shadowOpacity: glowShadowOpacity }]}>
              <LinearGradient
                colors={['#ffe580', '#FFD700', '#e6c200']}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.7, y: 1 }}
                style={styles.heroTile}
              >
                <View style={styles.heroLeft}>
                  <View style={styles.heroIcon}>
                    <Feather name="edit-2" size={scaleSize(22)} color="#001f3f" />
                  </View>
                  <Text style={styles.heroLabel}>Log Item</Text>
                  <Text style={styles.heroSub}>Tell us what you found</Text>
                </View>
                <Feather name="chevron-right" size={scaleSize(20)} color="rgba(0,31,63,0.5)" />
                <Animated.View
                  pointerEvents="none"
                  style={[styles.shimmerBar, { transform: [{ translateX: shimmerTranslate }, { rotate: '12deg' }] }]}
                />
              </LinearGradient>
            </Animated.View>
          </Pressable>

          {/* Row 2: Find + FlipBot */}
          <View style={styles.row2}>
            <Pressable
              onPress={() => navigation.navigate('Find')}
              style={({ pressed }) => [
                styles.midTile,
                { borderColor: 'rgba(30,144,255,0.22)' },
                pressed && styles.tilePressed,
              ]}
            >
              <View style={[styles.tileIcon, { backgroundColor: 'rgba(30,144,255,0.16)' }]}>
                <Feather name="search" size={scaleSize(17)} color={HUES.blue} />
              </View>
              <Text style={styles.tileLabel}>Find</Text>
              <Text style={styles.tileSub}>Scout nearby spots</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('FlipBot')}
              style={({ pressed }) => [
                styles.midTile,
                { borderColor: 'rgba(255,105,180,0.22)' },
                pressed && styles.tilePressed,
              ]}
            >
              <View style={[styles.tileIcon, { backgroundColor: 'rgba(255,105,180,0.16)' }]}>
                <Feather name="message-circle" size={scaleSize(17)} color={HUES.pink} />
              </View>
              <Text style={styles.tileLabel}>FlipBot</Text>
              <Text style={styles.tileSub}>Ask your sidekick</Text>
            </Pressable>
          </View>

          {/* Row 3: Fix + Flip + My Finds */}
          <View style={styles.row3}>
            <Pressable
              onPress={() => navigation.navigate('Fix')}
              style={({ pressed }) => [
                styles.smallTile,
                { borderColor: 'rgba(50,205,50,0.2)' },
                pressed && styles.tilePressed,
              ]}
            >
              <View style={[styles.tileIconSmall, { backgroundColor: 'rgba(50,205,50,0.16)' }]}>
                <Feather name="tool" size={scaleSize(14)} color={HUES.green} />
              </View>
              <Text style={styles.smallTileLabel}>Fix</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('Flip')}
              style={({ pressed }) => [
                styles.smallTile,
                { borderColor: 'rgba(255,215,0,0.28)' },
                pressed && styles.tilePressed,
              ]}
            >
              <View style={[styles.tileIconSmall, { backgroundColor: 'rgba(255,215,0,0.16)' }]}>
                <Feather name="dollar-sign" size={scaleSize(14)} color={HUES.gold} />
              </View>
              <Text style={styles.smallTileLabel}>Flip</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('MyFinds')}
              style={({ pressed }) => [
                styles.smallTile,
                { borderColor: 'rgba(147,112,219,0.22)' },
                pressed && styles.tilePressed,
              ]}
            >
              <View style={[styles.tileIconSmall, { backgroundColor: 'rgba(147,112,219,0.16)' }]}>
                <Feather name="box" size={scaleSize(14)} color={HUES.purple} />
              </View>
              <Text style={styles.smallTileLabel}>My Finds</Text>
            </Pressable>
          </View>
        </View>

        {/* Footer ribbon */}
        <View style={styles.ribbon}>
          <Pressable
            onPress={() => navigation.navigate('HowItWorks')}
            style={({ pressed }) => [styles.ribbonBtn, pressed && { opacity: 0.6 }]}
          >
            <Feather name="help-circle" size={scaleSize(14)} color="rgba(255,255,255,0.5)" />
            <Text style={styles.ribbonText}>How It Works</Text>
          </Pressable>
        </View>
      </View>

      {renderInfoModal()}
      {renderDeleteModal()}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: scaleSize(20),
    paddingTop: scaleSize(64),
    paddingBottom: scaleSize(28),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleSize(28),
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  wordmarkFlip: {
    fontSize: scaleFont(22),
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
  },
  wordmarkHQ: {
    fontSize: scaleFont(22),
    fontFamily: 'Poppins-SemiBold',
    color: '#FFD700',
  },
  infoBtn: {
    width: scaleSize(34),
    height: scaleSize(34),
    borderRadius: scaleSize(17),
    backgroundColor: 'rgba(255, 215, 0, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
  },
  ledger: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: scaleSize(16),
    padding: scaleSize(16),
    marginBottom: scaleSize(20),
  },
  ledgerLabel: {
    fontSize: scaleFont(10),
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.42)',
    fontFamily: 'Poppins-SemiBold',
    marginBottom: scaleSize(5),
  },
  ledgerHeroValue: {
    fontSize: scaleFont(34),
    fontFamily: 'Poppins-SemiBold',
    color: '#FFD700',
    lineHeight: scaleFont(36),
  },
  ledgerSub: {
    fontSize: scaleFont(12),
    color: 'rgba(255,255,255,0.42)',
    fontFamily: 'Poppins-Regular',
    paddingBottom: scaleSize(3),
  },
  ledgerSubBold: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
  bento: {
    gap: scaleSize(12),
  },
  heroShadowWrap: {
    borderRadius: scaleSize(20),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 30,
    elevation: 8,
  },
  heroTile: {
    borderRadius: scaleSize(20),
    padding: scaleSize(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  heroLeft: {
    flexShrink: 1,
  },
  heroIcon: {
    width: scaleSize(46),
    height: scaleSize(46),
    borderRadius: scaleSize(13),
    backgroundColor: 'rgba(0,31,63,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleSize(12),
  },
  heroLabel: {
    fontSize: scaleFont(17),
    fontFamily: 'Poppins-SemiBold',
    color: '#001f3f',
  },
  heroSub: {
    fontSize: scaleFont(11),
    color: 'rgba(0,31,63,0.62)',
    fontFamily: 'Poppins-Regular',
    marginTop: scaleSize(2),
  },
  shimmerBar: {
    position: 'absolute',
    top: scaleSize(-40),
    left: 0,
    width: scaleSize(60),
    height: scaleSize(220),
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  row2: {
    flexDirection: 'row',
    gap: scaleSize(12),
  },
  midTile: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderRadius: scaleSize(20),
    padding: scaleSize(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 3,
  },
  tileIcon: {
    width: scaleSize(34),
    height: scaleSize(34),
    borderRadius: scaleSize(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleSize(22),
  },
  tileLabel: {
    fontSize: scaleFont(14),
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
  },
  tileSub: {
    fontSize: scaleFont(10.5),
    color: 'rgba(255,255,255,0.42)',
    fontFamily: 'Poppins-Regular',
    marginTop: scaleSize(2),
  },
  row3: {
    flexDirection: 'row',
    gap: scaleSize(12),
  },
  smallTile: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderRadius: scaleSize(20),
    paddingVertical: scaleSize(14),
    paddingHorizontal: scaleSize(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 2,
  },
  tileIconSmall: {
    width: scaleSize(28),
    height: scaleSize(28),
    borderRadius: scaleSize(9),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleSize(16),
  },
  smallTileLabel: {
    fontSize: scaleFont(12.5),
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
  },
  tilePressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.95,
  },
  ribbon: {
    marginTop: 'auto',
    paddingTop: scaleSize(16),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  ribbonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaleSize(7),
    paddingVertical: scaleSize(12),
  },
  ribbonText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(12),
    letterSpacing: 0.2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scaleSize(24),
  },
  infoCard: {
    width: '100%',
    maxWidth: getResponsiveValue(scaleSize(320), scaleSize(360), scaleSize(400)),
    backgroundColor: '#001a35',
    borderRadius: scaleSize(22),
    padding: scaleSize(22),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: scaleSize(8),
  },
  modalCloseIcon: {
    width: scaleSize(28),
    height: scaleSize(28),
    borderRadius: scaleSize(14),
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoMetaSection: {
    marginBottom: scaleSize(18),
  },
  infoMeta: {
    fontSize: scaleFont(12.5),
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Poppins-Regular',
    marginBottom: scaleSize(2),
  },
  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: scaleSize(18),
  },
  infoDataSection: {
    marginBottom: 0,
  },
  infoLabel: {
    fontSize: scaleFont(10),
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.42)',
    fontFamily: 'Poppins-SemiBold',
    marginBottom: scaleSize(6),
  },
  infoText: {
    fontSize: scaleFont(12.5),
    lineHeight: scaleSize(20),
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Poppins-Regular',
  },
  wipeBtn: {
    width: '100%',
    backgroundColor: 'rgba(255,77,77,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,77,77,0.35)',
    borderRadius: scaleSize(12),
    paddingVertical: scaleSize(13),
    alignItems: 'center',
  },
  wipeBtnText: {
    color: '#ff4d4d',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(13),
  },
  deleteIconContainer: {
    width: scaleSize(64),
    height: scaleSize(64),
    borderRadius: scaleSize(32),
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleSize(20),
  },
  modalTitle: {
    fontSize: scaleFont(22),
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    marginBottom: scaleSize(12),
  },
  modalSubtitle: {
    fontSize: scaleFont(14),
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: scaleSize(20),
    marginBottom: scaleSize(32),
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: scaleSize(12),
  },
  modalBtn: {
    flex: 1,
    paddingVertical: scaleSize(14),
    borderRadius: scaleSize(12),
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
    fontSize: scaleFont(14),
    fontFamily: 'Poppins-SemiBold',
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
