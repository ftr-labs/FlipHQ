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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import { getLoggedItems, updateItemStatus } from '../utils/logManager';
import { calculateValuation } from '../utils/valuation';
import { categoryPlatforms } from '../constants/valuationMetadata';

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
          <Feather name="dollar-sign" size={48} color="rgba(255,255,255,0.1)" />
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
          onPress={async () => {
            if (!selectedItem) return;
            await updateItemStatus(selectedItem.id, 'Flipped');
            await loadItems();
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              })
            );
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
          <Feather name="arrow-left" size={24} color="#FFD700" />
        </Pressable>
        <Text style={styles.title}>Flip Strategist</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {items.length > 0 && (
          <Pressable style={styles.selectBox} onPress={() => setShowModal(true)}>
            <Feather name="package" size={16} color="#FFD700" />
            <Text style={styles.selectText}>
              {selectedItem ? selectedItem.name : 'Select item to flip'}
            </Text>
            <Feather name="chevron-down" size={16} color="rgba(255,255,255,0.4)" />
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
                <Feather name="x" size={24} color="#fff" />
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
                    <Feather name="check" size={20} color="#FFD700" />
                  )}
                </Pressable>
              )}
            />
          </View>
        </View>
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
    fontSize: 24,
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
  content: {
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectText: {
    flex: 1,
    marginLeft: 12,
    color: '#FFD700',
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },
  detailsBox: {
    gap: 24,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  label: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  itemName: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    marginTop: 4,
  },
  demandBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.1)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  demandLabel: {
    color: '#FFD700',
    fontSize: 10,
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'uppercase',
  },
  demandValue: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  strategyCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    marginBottom: 16,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rangeBox: {
    flex: 1,
    alignItems: 'center',
  },
  rangeLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    marginBottom: 4,
  },
  rangeValue: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
  },
  rangeDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  rangeHint: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
  section: {
    marginTop: 8,
  },
  platformScroll: {
    marginLeft: -24,
    paddingLeft: 24,
  },
  platformCard: {
    width: 200,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  platformName: {
    color: '#FFD700',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 8,
  },
  platformMeta: {
    gap: 4,
  },
  platformStrength: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  platformFee: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
  },
  checklist: {
    gap: 12,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  checkText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    flex: 1,
  },
  checkTextDone: {
    color: 'rgba(255,255,255,0.3)',
    textDecorationLine: 'line-through',
  },
  flippedBtn: {
    marginTop: 8,
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
  flippedBtnText: {
    color: '#001f3f',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    marginTop: 16,
    lineHeight: 24,
  },
  emptyBtn: {
    marginTop: 24,
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyBtnText: {
    color: '#001f3f',
    fontFamily: 'Poppins-SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#001a35',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
  },
  itemOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  itemOptionSelected: {
    borderBottomColor: '#FFD700',
  },
  optionName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  optionSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
  },
});
