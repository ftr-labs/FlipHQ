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
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import { getLoggedItems, updateItemStatus } from '../utils/logManager';
import { calculateValuation } from '../utils/valuation';
import { categoryToolkits } from '../constants/valuationMetadata';
import { scaleFont, scaleSize, getResponsiveValue } from '../utils/responsive';

export default function FixScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showFixCostModal, setShowFixCostModal] = useState(false);
  const [fixCost, setFixCost] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  const loadItems = async () => {
    const allItems = await getLoggedItems();
    // Only show items with status "Found" (not "Fixed" or "Flipped")
    const fixableItems = allItems.filter(i => i.status === 'Found');
    setItems(fixableItems);
    
    // Auto-select first item if none selected and items exist
    if (!selectedItem && fixableItems.length > 0) {
      setSelectedItem(fixableItems[0]);
    } else if (selectedItem && !fixableItems.find(i => i.id === selectedItem.id)) {
      // If current selected item is no longer in the list, clear selection
      setSelectedItem(null);
    }
  };

  const buildYouTubeQuery = (item) => {
    if (!item) return '';
    
    const categoryContext = {
      furniture: 'wooden',
      clothing: 'leather',
      electronics: 'electronic',
      tools: 'power tool',
      decor: 'home decor',
      collectibles: 'vintage'
    }[item.category] || '';
    
    // Convert camelCase subcategory to readable format (e.g., 'coffeeTable' -> 'coffee table')
    const formatSubcategory = (subcat) => {
      if (!subcat) return '';
      return subcat
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .trim();
    };
    
    const subcategory = formatSubcategory(item.subcategory);
    const condition = item.condition && item.condition !== 'None of the above' 
      ? item.condition.toLowerCase() 
      : '';
    
    // Build query: "how to fix [condition] [category context] [subcategory]"
    // Example: "how to fix chipped corner wooden table"
    const parts = [];
    if (condition) parts.push(condition);
    if (categoryContext) parts.push(categoryContext);
    if (subcategory) parts.push(subcategory);
    
    const query = parts.length > 0 ? parts.join(' ') : 'repair guide';
    return `how to fix ${query}`;
  };

  const openYouTube = () => {
    if (!selectedItem) return;
    const query = buildYouTubeQuery(selectedItem);
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    Linking.openURL(url);
  };

  const renderFixContent = () => {
    if (!selectedItem) {
      return (
        <View style={styles.emptyState}>
          <Feather name="tool" size={scaleSize(48)} color="rgba(255,255,255,0.1)" />
          <Text style={styles.emptyText}>No items to fix right now. Go log something first!</Text>
          <Pressable 
            style={styles.emptyBtn}
            onPress={() => navigation.navigate('Log')}
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

    const toolkit = categoryToolkits[selectedItem.category] || [];

    return (
      <View style={styles.detailsBox}>
        <View style={styles.itemHeader}>
          <View>
            <Text style={styles.label}>Repairing Item:</Text>
            <Text style={styles.itemName}>{selectedItem.name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,215,0,0.1)' }]}>
            <Text style={styles.statusText}>{selectedItem.status}</Text>
          </View>
        </View>

        {/* Fixability Score */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreInfo}>
            <Text style={styles.scoreLabel}>Fixability Score</Text>
            <Text style={styles.scoreValue}>{valuation.fixabilityScore}/10</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${valuation.fixabilityScore * 10}%`, backgroundColor: valuation.fixabilityScore > 7 ? '#32CD32' : valuation.fixabilityScore > 4 ? '#FFD700' : '#ff4444' }
              ]} 
            />
          </View>
          <Text style={styles.scoreHint}>
            {valuation.fixabilityScore > 7 ? 'High chance of easy repair.' : valuation.fixabilityScore > 4 ? 'Moderate effort required.' : 'Careful: This might be a tough one.'}
          </Text>
        </View>

        {/* YouTube Action */}
        <Pressable style={styles.youtubeBtn} onPress={openYouTube}>
          <Feather name="play" size={scaleSize(20)} color="#001f3f" />
          <Text style={styles.youtubeBtnText}>Watch Repair Guides</Text>
        </Pressable>
        <Text style={styles.disclosureText}>
          ⚠️ New feature: These are general repair guides. For specific items and cases, we recommend searching for more detailed repair instructions.
        </Text>

        {/* Hustle Toolkit */}
        <View style={styles.toolkitSection}>
          <Text style={styles.sectionTitle}>Hustle Toolkit</Text>
          <View style={styles.toolkitGrid}>
            {toolkit.map((tool, index) => (
              <View key={index} style={styles.toolItem}>
                <Feather name="check-circle" size={scaleSize(14)} color="#FFD700" />
                <Text style={styles.toolText}>{tool}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Financial Context */}
        <View style={styles.financialRow}>
          <View style={styles.financialBox}>
            <Text style={styles.finLabel}>Est. Fix Cost</Text>
            <Text style={styles.finValue}>${valuation.fixCost}</Text>
          </View>
          <View style={styles.financialBox}>
            <Text style={styles.finLabel}>Added Value</Text>
            <Text style={[styles.finValue, { color: '#32CD32' }]}>+${valuation.postFixValue - valuation.estimatedValue}</Text>
          </View>
        </View>

        {/* Status Update Buttons */}
        <View style={styles.actionButtons}>
          <Pressable 
            style={styles.fixedBtn}
            onPress={() => {
              if (!selectedItem) return;
              setShowFixCostModal(true);
            }}
          >
            <Text style={styles.fixedBtnText}>Mark as Fixed</Text>
          </Pressable>
          <Pressable 
            style={styles.skipBtn}
            onPress={async () => {
              if (!selectedItem) return;
              // Skip fixing - mark as Fixed so it can appear in Flip screen
              await updateItemStatus(selectedItem.id, 'Fixed');
              await loadItems();
              // Navigate to Home
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                })
              );
            }}
          >
            <Text style={styles.skipBtnText}>Doesn't Need Fixing</Text>
          </Pressable>
        </View>
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
        <Text style={styles.title}>Fix Hub</Text>
        <View style={{ width: scaleSize(24) }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {items.length > 0 && (
          <Pressable style={styles.selectBox} onPress={() => setShowModal(true)}>
            <Feather name="package" size={scaleSize(16)} color="#FFD700" />
            <Text style={styles.selectText}>
              {selectedItem ? selectedItem.name : 'Choose an item to fix'}
            </Text>
            <Feather name="chevron-down" size={scaleSize(16)} color="rgba(255,255,255,0.4)" />
          </Pressable>
        )}

        {renderFixContent()}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Fixable Finds</Text>
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
                  }}
                  style={[
                    styles.itemOption,
                    selectedItem?.id === item.id && styles.itemOptionSelected
                  ]}
                >
                  <View>
                    <Text style={styles.optionName}>{item.name}</Text>
                    <Text style={styles.optionSub}>{item.category} • {item.condition}</Text>
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

      {/* Fix Cost Input Modal */}
      <Modal
        visible={showFixCostModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowFixCostModal(false);
          setFixCost('');
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Fix Cost</Text>
            <Text style={styles.modalSubtitle}>How much did it cost to fix this item?</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={fixCost}
              onChangeText={setFixCost}
              keyboardType="decimal-pad"
              keyboardAppearance="dark"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => {
                  setShowFixCostModal(false);
                  setFixCost('');
                }}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalBtn, styles.modalSaveBtn]}
                onPress={async () => {
                  if (!selectedItem) return;
                  const cost = parseFloat(fixCost) || 0;
                  await updateItemStatus(selectedItem.id, 'Fixed', { fixCost: cost });
                  setShowFixCostModal(false);
                  setFixCost('');
                  await loadItems();
                  // Navigate to Home
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
  statusBadge: {
    paddingHorizontal: scaleSize(12),
    paddingVertical: scaleSize(6),
    borderRadius: scaleSize(8),
  },
  statusText: {
    color: '#FFD700',
    fontSize: scaleFont(12),
    fontFamily: 'Poppins-SemiBold',
  },
  scoreCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: scaleSize(16),
    padding: scaleSize(20),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  scoreInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSize(12),
  },
  scoreLabel: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(16),
  },
  scoreValue: {
    color: '#FFD700',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(18),
  },
  progressBarBg: {
    height: scaleSize(8),
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: scaleSize(4),
    marginBottom: scaleSize(12),
  },
  progressBarFill: {
    height: '100%',
    borderRadius: scaleSize(4),
  },
  scoreHint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: scaleFont(12),
    fontFamily: 'Poppins-Regular',
  },
  youtubeBtn: {
    backgroundColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleSize(16),
    borderRadius: scaleSize(12),
    gap: scaleSize(10),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  youtubeBtnText: {
    color: '#001f3f',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(16),
  },
  disclosureText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: scaleFont(11),
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginTop: scaleSize(8),
    lineHeight: scaleSize(16),
    fontStyle: 'italic',
  },
  toolkitSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: scaleSize(16),
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
  toolkitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleSize(12),
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: scaleSize(12),
    paddingVertical: scaleSize(8),
    borderRadius: scaleSize(8),
    gap: scaleSize(8),
  },
  toolText: {
    color: '#fff',
    fontSize: scaleFont(13),
    fontFamily: 'Poppins-Regular',
  },
  financialRow: {
    flexDirection: 'row',
    gap: scaleSize(16),
  },
  financialBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: scaleSize(16),
    padding: scaleSize(16),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  finLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: scaleFont(11),
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'uppercase',
  },
  finValue: {
    color: '#fff',
    fontSize: scaleFont(18),
    fontFamily: 'Poppins-SemiBold',
    marginTop: scaleSize(4),
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
  actionButtons: {
    gap: scaleSize(12),
    marginTop: scaleSize(8),
  },
  fixedBtn: {
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
  fixedBtnText: {
    color: '#001f3f',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(16),
  },
  skipBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: scaleSize(16),
    borderRadius: scaleSize(12),
    alignItems: 'center',
  },
  skipBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(14),
  },
});
