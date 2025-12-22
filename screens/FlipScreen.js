import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ScrollView,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import { getLoggedItems, updateItemStatus } from '../utils/logManager';
import { calculateValuation } from '../utils/valuation';
import { categoryPlatforms } from '../constants/valuationMetadata';
import { scaleFont, scaleSize, getResponsiveValue } from '../utils/responsive';

const listingChecklist = [
  'Deep clean the item for maximum appeal',
  'Take 5+ photos in bright natural light',
  'Capture every angle and any minor flaws',
  'Write a clear, honest description',
  'Research current "Sold" prices',
];

export default function FlipScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showSellPriceModal, setShowSellPriceModal] = useState(false);
  const [sellPrice, setSellPrice] = useState('');
  const [checkedItems, setCheckedItems] = useState({});

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  const loadItems = async () => {
    const allItems = await getLoggedItems();
    // Only show items with status "Fixed" (not "Found" or "Flipped")
    const flippableItems = allItems.filter(i => i.status === 'Fixed');
    setItems(flippableItems);
    
    if (!selectedItem && flippableItems.length > 0) {
      setSelectedItem(flippableItems[0]);
    } else if (selectedItem && !flippableItems.find(i => i.id === selectedItem.id)) {
      // If current selected item is no longer in the list, clear selection
      setSelectedItem(null);
    }
  };

  const toggleCheck = (index) => {
    setCheckedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const renderFlipContent = () => {
    if (!selectedItem) {
      return (
        <View style={styles.emptyState}>
          <Feather name="dollar-sign" size={scaleSize(48)} color="rgba(255,255,255,0.1)" />
          <Text style={styles.emptyText}>Nothing in inventory to flip. Time to go hunting!</Text>
          <Pressable 
            style={styles.emptyBtn}
            onPress={() => navigation.navigate('Find')}
          >
            <Text style={styles.emptyBtnText}>Start Scouting</Text>
          </Pressable>
        </View>
      );
    }

    const valuation = calculateValuation({
      category: selectedItem.category,
      subcategory: selectedItem.subcategory,
      type: selectedItem.type,
      condition: selectedItem.condition,
      acquisitionCost: selectedItem.acquisitionCost || 0,
    });

    const platforms = categoryPlatforms[selectedItem.category] || [];

    return (
      <View style={styles.detailsBox}>
        <View style={styles.itemHeader}>
          <View>
            <Text style={styles.label}>Listing Strategy for:</Text>
            <Text style={styles.itemName}>{selectedItem.name}</Text>
          </View>
          <View style={styles.demandBox}>
            <Text style={styles.demandLabel}>Demand</Text>
            <Text style={styles.demandValue}>{valuation.demandScore}/10</Text>
          </View>
        </View>

        {/* Pricing Strategy */}
        <View style={styles.strategyCard}>
          <Text style={styles.sectionTitle}>Target Price Ranges</Text>
          <View style={styles.rangeRow}>
            <View style={styles.rangeBox}>
              <Text style={styles.rangeLabel}>Quick Sale</Text>
              <Text style={styles.rangeValue}>${valuation.lowValue}</Text>
            </View>
            <View style={styles.rangeDivider} />
            <View style={styles.rangeBox}>
              <Text style={styles.rangeLabel}>Max Profit</Text>
              <Text style={[styles.rangeValue, { color: '#FFD700' }]}>${valuation.highValue}</Text>
            </View>
          </View>
          <Text style={styles.rangeHint}>Based on current market volatility and item condition.</Text>
        </View>

        {/* Platform Strategist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Best Marketplaces</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.platformScroll}>
            {platforms.map((platform, index) => (
              <View key={index} style={styles.platformCard}>
                <Text style={styles.platformName}>{platform.name}</Text>
                <View style={styles.platformMeta}>
                  <Text style={styles.platformStrength}>💪 {platform.strength}</Text>
                  <Text style={styles.platformFee}>💰 Fee: {platform.fee}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Pro Listing Checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pro Listing Checklist</Text>
          <View style={styles.checklist}>
            {listingChecklist.map((tip, index) => (
              <Pressable 
                key={index} 
                style={styles.checkItem}
                onPress={() => toggleCheck(index)}
              >
                <Feather 
                  name={checkedItems[index] ? "check-square" : "square"} 
                  size={18} 
                  color={checkedItems[index] ? "#32CD32" : "rgba(255,255,255,0.3)"} 
                />
                <Text style={[
                  styles.checkText,
                  checkedItems[index] && styles.checkTextDone
                ]}>
                  {tip}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Status Update Button */}
        <Pressable 
          style={styles.flippedBtn}
          onPress={() => {
            if (!selectedItem) return;
            setShowSellPriceModal(true);
          }}
        >
          <Text style={styles.flippedBtnText}>Mark as Flipped</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable 
          onPress={() => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              })
            );
          }} 
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={scaleSize(24)} color="#FFD700" />
        </Pressable>
        <Text style={styles.title}>Flip Strategist</Text>
        <View style={{ width: scaleSize(24) }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {items.length > 0 && (
          <Pressable style={styles.selectBox} onPress={() => setShowModal(true)}>
            <Feather name="package" size={scaleSize(16)} color="#FFD700" />
            <Text style={styles.selectText}>
              {selectedItem ? selectedItem.name : 'Select item to flip'}
            </Text>
            <Feather name="chevron-down" size={scaleSize(16)} color="rgba(255,255,255,0.4)" />
          </Pressable>
        )}

        {renderFlipContent()}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select an Item</Text>
              <Pressable onPress={() => setShowModal(false)}>
                <Feather name="x" size={scaleSize(24)} color="#fff" />
              </Pressable>
            </View>
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setSelectedItem(item);
                    setShowModal(false);
                    setCheckedItems({}); // Reset checklist for new item
                  }}
                  style={[
                    styles.itemOption,
                    selectedItem?.id === item.id && styles.itemOptionSelected
                  ]}
                >
                  <View>
                    <Text style={styles.optionName}>{item.name}</Text>
                    <Text style={styles.optionSub}>{item.status} • Profit: ${calculateValuation({
                      category: item.category,
                      subcategory: item.subcategory,
                      type: item.type,
                      condition: item.condition,
                      acquisitionCost: item.acquisitionCost || 0,
                    }).profit}</Text>
                  </View>
                  {selectedItem?.id === item.id && (
                    <Feather name="check" size={scaleSize(20)} color="#FFD700" />
                  )}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Sell Price Input Modal */}
      <Modal
        visible={showSellPriceModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSellPriceModal(false);
          setSellPrice('');
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sell Price</Text>
            <Text style={styles.modalSubtitle}>How much did you sell this item for?</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={sellPrice}
              onChangeText={setSellPrice}
              keyboardType="decimal-pad"
              keyboardAppearance="dark"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => {
                  setShowSellPriceModal(false);
                  setSellPrice('');
                }}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalBtn, styles.modalSaveBtn]}
                onPress={async () => {
                  if (!selectedItem) return;
                  const price = parseFloat(sellPrice) || 0;
                  await updateItemStatus(selectedItem.id, 'Flipped', { sellPrice: price });
                  setShowSellPriceModal(false);
                  setSellPrice('');
                  await loadItems();
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [{ name: 'Home' }],
                    })
                  );
                }}
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
    paddingTop: scaleSize(60),
    paddingBottom: scaleSize(20),
    paddingHorizontal: scaleSize(24),
  },
  backButton: {
    padding: scaleSize(4),
  },
  title: {
    fontSize: scaleFont(24),
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
  content: {
    paddingBottom: scaleSize(40),
    paddingHorizontal: scaleSize(24),
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: scaleSize(16),
    borderRadius: scaleSize(12),
    marginBottom: scaleSize(24),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectText: {
    flex: 1,
    marginLeft: scaleSize(12),
    color: '#FFD700',
    fontSize: scaleFont(15),
    fontFamily: 'Poppins-SemiBold',
  },
  detailsBox: {
    gap: scaleSize(24),
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  label: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: scaleFont(12),
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  itemName: {
    color: '#fff',
    fontSize: scaleFont(22),
    fontFamily: 'Poppins-SemiBold',
    marginTop: scaleSize(4),
  },
  demandBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.1)',
    padding: scaleSize(10),
    borderRadius: scaleSize(12),
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  demandLabel: {
    color: '#FFD700',
    fontSize: scaleFont(10),
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'uppercase',
  },
  demandValue: {
    color: '#fff',
    fontSize: scaleFont(16),
    fontFamily: 'Poppins-SemiBold',
  },
  strategyCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: scaleSize(20),
    padding: scaleSize(20),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(16),
    marginBottom: scaleSize(16),
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleSize(16),
  },
  rangeBox: {
    flex: 1,
    alignItems: 'center',
  },
  rangeLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: scaleFont(11),
    fontFamily: 'Poppins-Regular',
    marginBottom: scaleSize(4),
  },
  rangeValue: {
    color: '#fff',
    fontSize: scaleFont(22),
    fontFamily: 'Poppins-SemiBold',
  },
  rangeDivider: {
    width: 1,
    height: scaleSize(30),
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  rangeHint: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: scaleFont(11),
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
  section: {
    marginTop: scaleSize(8),
  },
  platformScroll: {
    marginLeft: scaleSize(-24),
    paddingLeft: scaleSize(24),
  },
  platformCard: {
    width: scaleSize(200),
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: scaleSize(16),
    padding: scaleSize(16),
    marginRight: scaleSize(12),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  platformName: {
    color: '#FFD700',
    fontSize: scaleFont(16),
    fontFamily: 'Poppins-SemiBold',
    marginBottom: scaleSize(8),
  },
  platformMeta: {
    gap: scaleSize(4),
  },
  platformStrength: {
    color: '#fff',
    fontSize: scaleFont(12),
    fontFamily: 'Poppins-Regular',
  },
  platformFee: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: scaleFont(11),
    fontFamily: 'Poppins-Regular',
  },
  checklist: {
    gap: scaleSize(12),
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: scaleSize(14),
    borderRadius: scaleSize(12),
    gap: scaleSize(12),
  },
  checkText: {
    color: '#fff',
    fontSize: scaleFont(13),
    fontFamily: 'Poppins-Regular',
    flex: 1,
  },
  checkTextDone: {
    color: 'rgba(255,255,255,0.3)',
    textDecorationLine: 'line-through',
  },
  flippedBtn: {
    marginTop: scaleSize(8),
    backgroundColor: '#FFD700',
    paddingVertical: scaleSize(16),
    borderRadius: scaleSize(12),
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  flippedBtnText: {
    color: '#001f3f',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(16),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: scaleSize(60),
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
    fontSize: scaleFont(16),
    marginTop: scaleSize(16),
    lineHeight: scaleSize(24),
  },
  emptyBtn: {
    marginTop: scaleSize(24),
    backgroundColor: '#FFD700',
    paddingHorizontal: scaleSize(24),
    paddingVertical: scaleSize(12),
    borderRadius: scaleSize(10),
  },
  emptyBtnText: {
    color: '#001f3f',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(14),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scaleSize(24),
  },
  modalContent: {
    backgroundColor: '#001a35',
    borderRadius: scaleSize(24),
    padding: scaleSize(24),
    width: '100%',
    maxWidth: getResponsiveValue(scaleSize(320), scaleSize(360), scaleSize(400)),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSize(24),
  },
  modalTitle: {
    color: '#fff',
    fontSize: scaleFont(22),
    fontFamily: 'Poppins-SemiBold',
    marginBottom: scaleSize(8),
  },
  modalSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: scaleFont(14),
    fontFamily: 'Poppins-Regular',
    marginBottom: scaleSize(24),
    textAlign: 'center',
    lineHeight: scaleSize(20),
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: scaleSize(12),
    padding: scaleSize(16),
    color: '#fff',
    fontFamily: 'Poppins-Regular',
    fontSize: scaleFont(16),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: scaleSize(24),
  },
  modalButtons: {
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
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modalSaveBtn: {
    backgroundColor: '#FFD700',
  },
  modalBtnText: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(14),
  },
  itemOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scaleSize(16),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  itemOptionSelected: {
    borderBottomColor: '#FFD700',
  },
  optionName: {
    color: '#fff',
    fontSize: scaleFont(16),
    fontFamily: 'Poppins-SemiBold',
  },
  optionSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: scaleFont(12),
    fontFamily: 'Poppins-Regular',
    marginTop: scaleSize(2),
  },
});
