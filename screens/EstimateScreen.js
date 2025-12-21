import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation, CommonActions } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { saveLoggedItem } from '../utils/logManager';
import { calculateValuation } from '../utils/valuation';

export default function EstimateScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { 
    category, 
    subcategory, 
    condition, 
    type, 
    source, 
    itemName: initialItemName,
    acquisitionCost = 0 
  } = route.params || {};

  const [showNameModal, setShowNameModal] = useState(false);
  const [itemName, setItemName] = useState(initialItemName || '');

  // Route params validation guard
  useEffect(() => {
    if (!subcategory || !type) {
      Alert.alert('Error', 'Missing required information. Returning to home.');
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        })
      );
    }
  }, [subcategory, type, navigation]);

  // Use shared valuation logic (only if params are valid)
  const valuation = (subcategory && type && category) ? calculateValuation({
    category,
    subcategory,
    type,
    condition,
    acquisitionCost
  }) : {
    estimatedValue: 0,
    fixCost: 0,
    postFixValue: 0,
    profit: 0,
    lowProfit: 0,
    highProfit: 0,
    demandScore: 0,
    fixabilityScore: 0,
    rating: 0
  };

  const { 
    estimatedValue, 
    fixCost, 
    postFixValue, 
    profit, 
    lowProfit,
    highProfit,
    demandScore,
    fixabilityScore,
    rating 
  } = valuation;

  const flipWorthiness = '⭐'.repeat(rating).padEnd(5, '☆');

  const resetToHome = () =>
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      })
    );

  const handleLog = async () => {
    const finalName = itemName.trim();
    if (!finalName) {
      Alert.alert('Error', 'Please give your item a name.');
      return;
    }

    const itemToLog = {
      name: finalName,
      category,
      subcategory,
      condition,
      type,
      estimatedValue,
      fixCost,
      postFixValue,
      acquisitionCost,
      profit, // Save the calculated profit
      source: source || 'Custom Entry',
      loggedAt: new Date().toISOString(),
    };

    await saveLoggedItem(itemToLog);
    setShowNameModal(false);
    resetToHome();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#FFD700" />
        </Pressable>
        <Text style={styles.title}>Valuation</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.ratingSection}>
            <Text style={styles.ratingTitle}>Flip Worthiness</Text>
            <Text style={styles.ratingStars}>{flipWorthiness}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Est. Profit Range</Text>
              <Text style={[styles.detailValue, { color: lowProfit >= 0 ? '#32CD32' : '#ff4444' }]}>
                ${lowProfit} – ${highProfit}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Market Demand</Text>
              <Text style={styles.detailValue}>{demandScore}/10</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Fixability</Text>
              <Text style={styles.detailValue}>{fixabilityScore}/10</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Post-Fix Value</Text>
              <Text style={styles.detailValue}>${postFixValue}</Text>
            </View>
          </View>

          {acquisitionCost > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Feather name="dollar-sign" size={14} color="rgba(255,255,255,0.4)" />
                <Text style={styles.infoText}>Acquisition Cost: ${acquisitionCost}</Text>
              </View>
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Feather name="tag" size={14} color="rgba(255,255,255,0.4)" />
            <Text style={styles.infoText}>{category} • {subcategory} • {type}</Text>
          </View>
          {source && (
            <View style={[styles.infoRow, { marginTop: 8 }]}>
              <Feather name="map-pin" size={14} color="rgba(255,255,255,0.4)" />
              <Text style={styles.infoText}>Source: {source}</Text>
            </View>
          )}
        </View>

        <Text style={styles.disclosureText}>
          Valuations are estimates based on market data and may vary. Always research current market prices before making purchase decisions.
        </Text>

        <View style={styles.buttonContainer}>
          <Pressable 
            style={styles.logBtn} 
            onPress={() => {
              if (initialItemName) {
                handleLog(); // Directly log if name was already provided
              } else {
                setShowNameModal(true);
              }
            }}
          >
            <Text style={styles.logBtnText}>Save to Inventory</Text>
          </Pressable>
          <Pressable style={styles.ditchBtn} onPress={resetToHome}>
            <Text style={styles.ditchBtnText}>Ditch It</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={showNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNameModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Name Your Item</Text>
            <Text style={styles.modalSubtitle}>Give this gem a name to track it</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Vintage Leather Jacket"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={itemName}
              onChangeText={setItemName}
              autoFocus
              keyboardAppearance="dark"
            />
            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.modalBtn, styles.modalCancelBtn]} 
                onPress={() => setShowNameModal(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalBtn, styles.modalSaveBtn]} 
                onPress={handleLog}
              >
                <Text style={[styles.modalBtnText, { color: '#001f3f' }]}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  title: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    marginBottom: 40,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  ratingStars: {
    fontSize: 32,
    letterSpacing: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 20,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    width: '48%',
    marginBottom: 20,
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    marginBottom: 4,
  },
  detailValue: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  buttonContainer: {
    gap: 16,
  },
  logBtn: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logBtnText: {
    color: '#001f3f',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
  ditchBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  ditchBtnText: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#001f3f',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    marginBottom: 24,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modalSaveBtn: {
    backgroundColor: '#FFD700',
  },
  modalBtnText: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  disclosureText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 16,
    paddingHorizontal: 16,
  },
});
