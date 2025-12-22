import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Linking,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { 
  getLoggedItems, 
  updateItemStatus, 
  deleteItem, 
  getSavedSpots, 
  removeSavedSpot 
} from '../utils/logManager';
import { calculateValuation } from '../utils/valuation';
import { scaleFont, scaleSize, getResponsiveValue } from '../utils/responsive';

const statusColors = {
  Found: '#1E90FF',
  Fixed: '#32CD32',
  Flipped: '#FFD700',
};

const statusOrder = ['Found', 'Fixed', 'Flipped'];

export default function MyFindsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'leads'
  const [inventory, setInventory] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
  const [showDeleteLeadModal, setShowDeleteLeadModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [leadToDelete, setLeadToDelete] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [activeTab])
  );

  const loadData = async () => {
    setLoading(true);
    if (activeTab === 'inventory') {
      const items = await getLoggedItems();
      setInventory(items);
    } else {
      const spots = await getSavedSpots();
      setLeads(spots);
    }
    setLoading(false);
  };

  const handleToggleStatus = async (item) => {
    const currentIndex = statusOrder.indexOf(item.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    await updateItemStatus(item.id, nextStatus);
    loadData();
  };

  const handleDeleteItem = (item) => {
    setItemToDelete(item);
    setShowDeleteItemModal(true);
  };

  const confirmDeleteItem = async () => {
    if (itemToDelete) {
      await deleteItem(itemToDelete.id);
      setShowDeleteItemModal(false);
      setItemToDelete(null);
      loadData();
    }
  };

  const handleDeleteLead = (lead) => {
    setLeadToDelete(lead);
    setShowDeleteLeadModal(true);
  };

  const confirmDeleteLead = async () => {
    if (leadToDelete) {
      await removeSavedSpot(leadToDelete.id);
      setShowDeleteLeadModal(false);
      setLeadToDelete(null);
      loadData();
    }
  };

  const openInMaps = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url);
  };

  const calculateStats = () => {
    const active = inventory.filter(i => i.status !== 'Flipped');
    const flipped = inventory.filter(i => i.status === 'Flipped');
    
    const potentialProfitLow = active.reduce((sum, i) => {
      // Use real fixCost if available, otherwise get from valuation
      const realFixCost = i.fixCost !== undefined ? i.fixCost : null;
      const val = calculateValuation({ category: i.category, subcategory: i.subcategory, type: i.type, condition: i.condition, acquisitionCost: i.acquisitionCost || 0 });
      const fixCostToUse = realFixCost !== null ? realFixCost : val.fixCost;
      const postFixValue = i.postFixValue || val.postFixValue;
      const acquisitionCost = i.acquisitionCost || 0;
      // Calculate low profit: postFixValue - fixCost - acquisitionCost
      const profit = postFixValue - fixCostToUse - acquisitionCost;
      return sum + profit;
    }, 0);

    const potentialProfitHigh = active.reduce((sum, i) => {
      // Use real fixCost if available, otherwise get from valuation
      const realFixCost = i.fixCost !== undefined ? i.fixCost : null;
      const val = calculateValuation({ category: i.category, subcategory: i.subcategory, type: i.type, condition: i.condition, acquisitionCost: i.acquisitionCost || 0 });
      const fixCostToUse = realFixCost !== null ? realFixCost : val.fixCost;
      const postFixValue = i.postFixValue || val.postFixValue;
      const acquisitionCost = i.acquisitionCost || 0;
      // Calculate high profit: postFixValue - fixCost - acquisitionCost
      const profit = postFixValue - fixCostToUse - acquisitionCost;
      return sum + profit;
    }, 0);

    const totalEarned = flipped.reduce((sum, i) => {
      // Use real sellPrice if available, otherwise calculate from valuation
      if (i.sellPrice !== undefined && i.sellPrice !== null) {
        const realFixCost = i.fixCost !== undefined ? i.fixCost : 0;
        const acquisitionCost = i.acquisitionCost || 0;
        const profit = i.sellPrice - realFixCost - acquisitionCost;
        return sum + profit;
      } else {
        // Fallback to estimated profit
        const val = calculateValuation({ category: i.category, subcategory: i.subcategory, type: i.type, condition: i.condition, acquisitionCost: i.acquisitionCost || 0 });
        return sum + val.profit;
      }
    }, 0);

    return { potentialProfitLow, potentialProfitHigh, totalEarned };
  };

  const stats = calculateStats();

  const renderInventoryItem = ({ item }) => {
    // Calculate values using real numbers when available, estimates as fallback
    const val = calculateValuation({ 
      category: item.category, 
      subcategory: item.subcategory, 
      type: item.type, 
      condition: item.condition, 
      acquisitionCost: item.acquisitionCost || 0 
    });
    
    // Use real fixCost if available, otherwise use estimate
    const fixCostToUse = item.fixCost !== undefined ? item.fixCost : val.fixCost;
    
    // Use real postFixValue if available, otherwise use estimate
    const postFixValueToUse = item.postFixValue || val.postFixValue;
    
    // Calculate profit: for flipped items use sellPrice, otherwise use postFixValue
    let profit;
    if (item.status === 'Flipped' && item.sellPrice !== undefined && item.sellPrice !== null) {
      // Use real sell price for flipped items
      profit = item.sellPrice - fixCostToUse - (item.acquisitionCost || 0);
    } else {
      // Use postFixValue for non-flipped items
      profit = postFixValueToUse - fixCostToUse - (item.acquisitionCost || 0);
    }
    
    return (
      <Pressable 
        style={[styles.card, { borderLeftColor: statusColors[item.status] }]}
        onLongPress={() => handleDeleteItem(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemCategory}>{item.category} • {item.subcategory}</Text>
          </View>
          <Pressable 
            onPress={() => handleToggleStatus(item)}
            style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '20' }]}
          >
            <Text style={[styles.statusText, { color: statusColors[item.status] }]}>{item.status}</Text>
          </Pressable>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>
              {item.status === 'Flipped' && item.sellPrice !== undefined ? 'Sold For' : 'Value'}
            </Text>
            <Text style={styles.statValue}>
              ${item.status === 'Flipped' && item.sellPrice !== undefined ? item.sellPrice : postFixValueToUse}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Fix Cost</Text>
            <Text style={styles.statValue}>${fixCostToUse}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Profit</Text>
            <Text style={[styles.statValue, { color: profit >= 0 ? '#32CD32' : '#ff4444' }]}>
              ${Math.round(profit)}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderLeadItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemCategory}>{item.address}</Text>
        </View>
        <Pressable 
          onPress={() => handleDeleteLead(item)}
          style={styles.deleteLeadBtn}
        >
          <Feather name="x" size={scaleSize(18)} color="rgba(255,255,255,0.3)" />
        </Pressable>
      </View>
      <View style={styles.actionRow}>
        <Pressable 
          onPress={() => openInMaps(item.lat, item.lng)}
          style={styles.leadActionBtn}
        >
          <Feather name="navigation" size={scaleSize(14)} color="#FFD700" />
          <Text style={styles.leadActionText}>Navigate</Text>
        </Pressable>
        <Pressable 
          onPress={() => navigation.navigate('Log', { fromSpot: item.name })}
          style={[styles.leadActionBtn, { borderColor: 'rgba(255,255,255,0.1)' }]}
        >
          <Feather name="edit-2" size={scaleSize(14)} color="#fff" />
          <Text style={[styles.leadActionText, { color: '#fff' }]}>Log Item</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={scaleSize(24)} color="#FFD700" />
        </Pressable>
        <Text style={styles.title}>My Finds</Text>
        <View style={{ width: scaleSize(24) }} />
      </View>

      <View style={styles.tabContainer}>
        <Pressable 
          onPress={() => setActiveTab('inventory')}
          style={[styles.tab, activeTab === 'inventory' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'inventory' && styles.activeTabText]}>Inventory</Text>
        </Pressable>
        <Pressable 
          onPress={() => setActiveTab('leads')}
          style={[styles.tab, activeTab === 'leads' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'leads' && styles.activeTabText]}>Leads</Text>
        </Pressable>
      </View>

      {activeTab === 'inventory' && inventory.length > 0 && (
        <View style={styles.statsHeader}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Potential Profit</Text>
            <Text style={styles.summaryValue}>${stats.potentialProfitLow}-${stats.potentialProfitHigh}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Earned</Text>
            <Text style={[styles.summaryValue, { color: '#FFD700' }]}>${stats.totalEarned}</Text>
          </View>
        </View>
      )}

      <FlatList
        data={activeTab === 'inventory' ? inventory : leads}
        keyExtractor={(item) => item.id}
        renderItem={activeTab === 'inventory' ? renderInventoryItem : renderLeadItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          activeTab === 'inventory' && inventory.length > 0 ? (
            <View style={styles.disclosureContainer}>
              <Text style={styles.disclosureText}>Hold item to delete</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather 
              name={activeTab === 'inventory' ? "box" : "map-pin"} 
              size={48} 
              color="rgba(255,255,255,0.1)" 
            />
            <Text style={styles.emptyText}>
              {activeTab === 'inventory' 
                ? "No items logged yet. Spotted a gem? Log it!" 
                : "No leads saved. Head to the Find screen to scout some spots!"}
            </Text>
            <Pressable 
              onPress={() => navigation.navigate(activeTab === 'inventory' ? 'Log' : 'Find')}
              style={styles.emptyBtn}
            >
              <Text style={styles.emptyBtnText}>
                {activeTab === 'inventory' ? "Go Log Item" : "Start Scouting"}
              </Text>
            </Pressable>
          </View>
        }
      />

      {/* Delete Item Modal */}
      <Modal
        visible={showDeleteItemModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteItemModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { borderColor: 'rgba(255, 68, 68, 0.3)' }]}>
            <View style={styles.deleteIconContainer}>
              <Feather name="alert-triangle" size={scaleSize(32)} color="#ff4444" />
            </View>
            
            <Text style={styles.modalTitle}>Delete Item?</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to remove "{itemToDelete?.name}"? This cannot be undone.
            </Text>

            <View style={styles.modalActionRow}>
              <Pressable 
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => {
                  setShowDeleteItemModal(false);
                  setItemToDelete(null);
                }}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.modalBtn, styles.modalConfirmBtn]}
                onPress={confirmDeleteItem}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Lead Modal */}
      <Modal
        visible={showDeleteLeadModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteLeadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { borderColor: 'rgba(255, 68, 68, 0.3)' }]}>
            <View style={styles.deleteIconContainer}>
              <Feather name="alert-triangle" size={scaleSize(32)} color="#ff4444" />
            </View>
            
            <Text style={styles.modalTitle}>Remove Lead?</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to remove "{leadToDelete?.name}"? This cannot be undone.
            </Text>

            <View style={styles.modalActionRow}>
              <Pressable 
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => {
                  setShowDeleteLeadModal(false);
                  setLeadToDelete(null);
                }}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.modalBtn, styles.modalConfirmBtn]}
                onPress={confirmDeleteLead}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Remove</Text>
              </Pressable>
            </View>
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
    paddingTop: scaleSize(60),
    paddingBottom: scaleSize(20),
    paddingHorizontal: scaleSize(24),
  },
  backButton: {
    padding: scaleSize(4),
  },
  title: {
    color: '#fff',
    fontSize: scaleFont(24),
    fontFamily: 'Poppins-SemiBold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: scaleSize(24),
    borderRadius: scaleSize(12),
    padding: scaleSize(4),
    marginBottom: scaleSize(20),
  },
  tab: {
    flex: 1,
    paddingVertical: scaleSize(10),
    alignItems: 'center',
    borderRadius: scaleSize(10),
  },
  activeTab: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabText: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(14),
  },
  activeTabText: {
    color: '#FFD700',
  },
  statsHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,215,0,0.05)',
    marginHorizontal: scaleSize(24),
    borderRadius: scaleSize(18),
    padding: scaleSize(20),
    marginBottom: scaleSize(20),
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.1)',
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: scaleFont(12),
    fontFamily: 'Poppins-Regular',
    marginBottom: scaleSize(4),
  },
  summaryValue: {
    color: '#fff',
    fontSize: scaleFont(20),
    fontFamily: 'Poppins-SemiBold',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: scaleSize(10),
  },
  listContent: {
    paddingHorizontal: scaleSize(24),
    paddingBottom: scaleSize(100),
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: scaleSize(18),
    padding: scaleSize(16),
    marginBottom: scaleSize(16),
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scaleSize(16),
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: scaleSize(12),
  },
  itemName: {
    color: '#fff',
    fontSize: scaleFont(16),
    fontFamily: 'Poppins-SemiBold',
  },
  itemCategory: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: scaleFont(12),
    fontFamily: 'Poppins-Regular',
    marginTop: scaleSize(2),
  },
  statusBadge: {
    paddingHorizontal: scaleSize(10),
    paddingVertical: scaleSize(4),
    borderRadius: scaleSize(8),
  },
  statusText: {
    fontSize: scaleFont(11),
    fontFamily: 'Poppins-SemiBold',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: scaleSize(12),
  },
  statBox: {
    alignItems: 'flex-start',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: scaleFont(10),
    fontFamily: 'Poppins-Regular',
    marginBottom: scaleSize(2),
  },
  statValue: {
    color: '#fff',
    fontSize: scaleFont(14),
    fontFamily: 'Poppins-SemiBold',
  },
  deleteLeadBtn: {
    padding: scaleSize(4),
  },
  actionRow: {
    flexDirection: 'row',
    gap: scaleSize(12),
  },
  leadActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
    paddingVertical: scaleSize(10),
    borderRadius: scaleSize(10),
    gap: scaleSize(8),
  },
  leadActionText: {
    color: '#FFD700',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(13),
  },
  emptyContainer: {
    paddingTop: scaleSize(60),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleSize(40),
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Poppins-Regular',
    fontSize: scaleFont(15),
    marginTop: scaleSize(16),
    textAlign: 'center',
    lineHeight: scaleSize(22),
  },
  emptyBtn: {
    marginTop: scaleSize(24),
    backgroundColor: '#FFD700',
    paddingHorizontal: scaleSize(24),
    paddingVertical: scaleSize(12),
    borderRadius: scaleSize(12),
  },
  emptyBtnText: {
    color: '#001f3f',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(14),
  },
  disclosureContainer: {
    paddingBottom: scaleSize(12),
    paddingTop: scaleSize(4),
  },
  disclosureText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: scaleFont(11),
    fontFamily: 'Poppins-Regular',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scaleSize(24),
  },
  modalCard: {
    width: '100%',
    maxWidth: getResponsiveValue(scaleSize(320), scaleSize(360), scaleSize(400)),
    backgroundColor: '#001a35',
    borderRadius: scaleSize(24),
    padding: scaleSize(24),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
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
    textAlign: 'center',
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
    width: '100%',
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
