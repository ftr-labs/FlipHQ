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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getLoggedItems } from '../utils/logManager';
import { calculateValuation } from '../utils/valuation';
import { categoryToolkits } from '../constants/valuationMetadata';

export default function FixScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  const loadItems = async () => {
    const allItems = await getLoggedItems();
    // Only show items that are not yet flipped
    const fixableItems = allItems.filter(i => i.status !== 'Flipped');
    setItems(fixableItems);
    
    // Auto-select first item if none selected and items exist
    if (!selectedItem && fixableItems.length > 0) {
      setSelectedItem(fixableItems[0]);
    }
  };

  const openYouTube = () => {
    if (!selectedItem) return;
    const query = encodeURIComponent(`how to fix ${selectedItem.name} ${selectedItem.condition}`);
    const url = `https://www.youtube.com/results?search_query=${query}`;
    Linking.openURL(url);
  };

  const renderFixContent = () => {
    if (!selectedItem) {
      return (
        <View style={styles.emptyState}>
          <Feather name="tool" size={48} color="rgba(255,255,255,0.1)" />
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
          <Feather name="play" size={20} color="#001f3f" />
          <Text style={styles.youtubeBtnText}>Watch Repair Guides</Text>
        </Pressable>

        {/* Hustle Toolkit */}
        <View style={styles.toolkitSection}>
          <Text style={styles.sectionTitle}>Hustle Toolkit</Text>
          <View style={styles.toolkitGrid}>
            {toolkit.map((tool, index) => (
              <View key={index} style={styles.toolItem}>
                <Feather name="check-circle" size={14} color="#FFD700" />
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
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#FFD700" />
        </Pressable>
        <Text style={styles.title}>Fix Hub</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {items.length > 0 && (
          <Pressable style={styles.selectBox} onPress={() => setShowModal(true)}>
            <Feather name="package" size={16} color="#FFD700" />
            <Text style={styles.selectText}>
              {selectedItem ? selectedItem.name : 'Choose an item to fix'}
            </Text>
            <Feather name="chevron-down" size={16} color="rgba(255,255,255,0.4)" />
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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFD700',
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  scoreCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  scoreInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreLabel: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
  scoreValue: {
    color: '#FFD700',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreHint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  youtubeBtn: {
    backgroundColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  youtubeBtnText: {
    color: '#001f3f',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
  toolkitSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
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
  toolkitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  toolText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
  },
  financialRow: {
    flexDirection: 'row',
    gap: 16,
  },
  financialBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  finLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'uppercase',
  },
  finValue: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    marginTop: 4,
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
