import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Linking,
  Alert,
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
    Alert.alert(
      'Delete Item?',
      `Are you sure you want to remove "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteItem(item.id);
          loadData();
        }}
      ]
    );
  };

  const handleDeleteLead = (lead) => {
    Alert.alert(
      'Remove Lead?',
      `Are you sure you want to remove "${lead.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: async () => {
          await removeSavedSpot(lead.id);
          loadData();
        }}
      ]
    );
  };

  const openInMaps = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url);
  };

  const calculateStats = () => {
    const active = inventory.filter(i => i.status !== 'Flipped');
    const flipped = inventory.filter(i => i.status === 'Flipped');
    
    const potentialProfitLow = active.reduce((sum, i) => {
      const val = calculateValuation({ subcategory: i.subcategory, type: i.type, condition: i.condition, acquisitionCost: i.acquisitionCost });
      return sum + val.lowProfit;
    }, 0);

    const potentialProfitHigh = active.reduce((sum, i) => {
      const val = calculateValuation({ subcategory: i.subcategory, type: i.type, condition: i.condition, acquisitionCost: i.acquisitionCost });
      return sum + val.highProfit;
    }, 0);

    const totalEarned = flipped.reduce((sum, i) => {
      const val = calculateValuation({ subcategory: i.subcategory, type: i.type, condition: i.condition, acquisitionCost: i.acquisitionCost });
      return sum + val.profit; // Use exact profit for flipped items
    }, 0);

    return { potentialProfitLow, potentialProfitHigh, totalEarned };
  };

  const stats = calculateStats();

  const renderInventoryItem = ({ item }) => (
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
          <Text style={styles.statLabel}>Value</Text>
          <Text style={styles.statValue}>${item.postFixValue}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Fix Cost</Text>
          <Text style={styles.statValue}>${item.fixCost}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Profit</Text>
          <Text style={[styles.statValue, { color: (item.profit ?? (item.postFixValue - item.fixCost - (item.acquisitionCost || 0))) >= 0 ? '#32CD32' : '#ff4444' }]}>
            ${item.profit ?? (item.postFixValue - item.fixCost - (item.acquisitionCost || 0))}
          </Text>
        </View>
      </View>
    </Pressable>
  );

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
          <Feather name="x" size={18} color="rgba(255,255,255,0.3)" />
        </Pressable>
      </View>
      <View style={styles.actionRow}>
        <Pressable 
          onPress={() => openInMaps(item.lat, item.lng)}
          style={styles.leadActionBtn}
        >
          <Feather name="navigation" size={14} color="#FFD700" />
          <Text style={styles.leadActionText}>Navigate</Text>
        </Pressable>
        <Pressable 
          onPress={() => navigation.navigate('Log', { fromSpot: item.name })}
          style={[styles.leadActionBtn, { borderColor: 'rgba(255,255,255,0.1)' }]}
        >
          <Feather name="edit-2" size={14} color="#fff" />
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
          <Feather name="arrow-left" size={24} color="#FFD700" />
        </Pressable>
        <Text style={styles.title}>My Finds</Text>
        <View style={{ width: 24 }} />
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 24,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabText: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  activeTabText: {
    color: '#FFD700',
  },
  statsHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,215,0,0.05)',
    marginHorizontal: 24,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.1)',
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    marginBottom: 4,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 10,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  itemCategory: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 12,
  },
  statBox: {
    alignItems: 'flex-start',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
    marginBottom: 2,
  },
  statValue: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  deleteLeadBtn: {
    padding: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  leadActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  leadActionText: {
    color: '#FFD700',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    marginTop: 24,
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: '#001f3f',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
});
