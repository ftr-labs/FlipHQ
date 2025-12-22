import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Linking,
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
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [itemName, setItemName] = useState(initialItemName || '');

  // Route params validation guard
  useEffect(() => {
    if (!subcategory || !type) {
      setErrorMessage('Missing required information. Returning to home.');
      setShowErrorModal(true);
      setTimeout(() => {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          })
        );
      }, 2000);
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

  const openTool = async (url) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  const getToolUrl = (toolName, subcategory) => {
    const urls = {
      tradingCard: {
        'TCGPlayer': 'https://www.tcgplayer.com',
        'eBay Sold Listings': 'https://www.ebay.com/sch/i.html?_nkw=trading+cards&LH_Complete=1&LH_Sold=1',
        'PSA Price Guide': 'https://www.psacard.com/price-guide',
      },
      coin: {
        'PCGS Price Guide': 'https://www.pcgs.com/priceguide',
        'NGC Coin Explorer': 'https://www.ngccoin.com/coin-explorer',
        'eBay Sold': 'https://www.ebay.com/sch/i.html?_nkw=coins&LH_Complete=1&LH_Sold=1',
      },
      comicBook: {
        'GoCollect': 'https://gocollect.com',
        'eBay Sold': 'https://www.ebay.com/sch/i.html?_nkw=comic+books&LH_Complete=1&LH_Sold=1',
        'CGC Census': 'https://www.cgccomics.com/census/',
      },
      sportsMemorabilia: {
        'PSA': 'https://www.psacard.com',
        'Heritage Auctions': 'https://www.ha.com',
        'eBay Sold': 'https://www.ebay.com/sch/i.html?_nkw=sports+memorabilia&LH_Complete=1&LH_Sold=1',
      },
      general: {
        'eBay Sold Listings (filter by "Sold")': 'https://www.ebay.com/sch/i.html?LH_Complete=1&LH_Sold=1',
        'WorthPoint': 'https://www.worthpoint.com',
      },
    };

    if (urls[subcategory] && urls[subcategory][toolName]) {
      return urls[subcategory][toolName];
    }
    if (urls.general && urls.general[toolName]) {
      return urls.general[toolName];
    }
    return null;
  };

  const handleLog = async () => {
    const finalName = itemName.trim();
    if (!finalName) {
      setErrorMessage('Please give your item a name.');
      setShowErrorModal(true);
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
        {category === 'collectibles' ? (
          <View style={styles.card}>
            <View style={styles.guidanceHeader}>
              <Text style={styles.guidanceTitle}>Collectibles Require Specialized Valuation</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.toolsSection}>
              <Text style={styles.toolsSectionTitle}>Recommended Valuation Tools</Text>
              
              {subcategory === 'tradingCard' && (
                <View style={styles.toolGroup}>
                  <View style={styles.toolList}>
                    <Pressable 
                      style={styles.toolItem}
                      onPress={() => openTool(getToolUrl('TCGPlayer', 'tradingCard'))}
                    >
                      <Feather name="external-link" size={14} color="#FFD700" />
                      <Text style={styles.toolText}>TCGPlayer</Text>
                    </Pressable>
                    <Pressable 
                      style={styles.toolItem}
                      onPress={() => openTool(getToolUrl('eBay Sold Listings', 'tradingCard'))}
                    >
                      <Feather name="external-link" size={14} color="#FFD700" />
                      <Text style={styles.toolText}>eBay Sold Listings</Text>
                    </Pressable>
                    <Pressable 
                      style={styles.toolItem}
                      onPress={() => openTool(getToolUrl('PSA Price Guide', 'tradingCard'))}
                    >
                      <Feather name="external-link" size={14} color="#FFD700" />
                      <Text style={styles.toolText}>PSA Price Guide</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {subcategory === 'coin' && (
                <View style={styles.toolGroup}>
                  <View style={styles.toolList}>
                    <Pressable 
                      style={styles.toolItem}
                      onPress={() => openTool(getToolUrl('PCGS Price Guide', 'coin'))}
                    >
                      <Feather name="external-link" size={14} color="#FFD700" />
                      <Text style={styles.toolText}>PCGS Price Guide</Text>
                    </Pressable>
                    <Pressable 
                      style={styles.toolItem}
                      onPress={() => openTool(getToolUrl('NGC Coin Explorer', 'coin'))}
                    >
                      <Feather name="external-link" size={14} color="#FFD700" />
                      <Text style={styles.toolText}>NGC Coin Explorer</Text>
                    </Pressable>
                    <Pressable 
                      style={styles.toolItem}
                      onPress={() => openTool(getToolUrl('eBay Sold', 'coin'))}
                    >
                      <Feather name="external-link" size={14} color="#FFD700" />
                      <Text style={styles.toolText}>eBay Sold</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {subcategory === 'comicBook' && (
                <View style={styles.toolGroup}>
                  <View style={styles.toolList}>
                    <Pressable 
                      style={styles.toolItem}
                      onPress={() => openTool(getToolUrl('GoCollect', 'comicBook'))}
                    >
                      <Feather name="external-link" size={14} color="#FFD700" />
                      <Text style={styles.toolText}>GoCollect</Text>
                    </Pressable>
                    <Pressable 
                      style={styles.toolItem}
                      onPress={() => openTool(getToolUrl('eBay Sold', 'comicBook'))}
                    >
                      <Feather name="external-link" size={14} color="#FFD700" />
                      <Text style={styles.toolText}>eBay Sold</Text>
                    </Pressable>
                    <Pressable 
                      style={styles.toolItem}
                      onPress={() => openTool(getToolUrl('CGC Census', 'comicBook'))}
                    >
                      <Feather name="external-link" size={14} color="#FFD700" />
                      <Text style={styles.toolText}>CGC Census</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {subcategory === 'sportsMemorabilia' && (
                <View style={styles.toolGroup}>
                  <View style={styles.toolList}>
                    <Pressable 
                      style={styles.toolItem}
                      onPress={() => openTool(getToolUrl('PSA', 'sportsMemorabilia'))}
                    >
                      <Feather name="external-link" size={14} color="#FFD700" />
                      <Text style={styles.toolText}>PSA</Text>
                    </Pressable>
                    <Pressable 
                      style={styles.toolItem}
                      onPress={() => openTool(getToolUrl('Heritage Auctions', 'sportsMemorabilia'))}
                    >
                      <Feather name="external-link" size={14} color="#FFD700" />
                      <Text style={styles.toolText}>Heritage Auctions</Text>
                    </Pressable>
                    <Pressable 
                      style={styles.toolItem}
                      onPress={() => openTool(getToolUrl('eBay Sold', 'sportsMemorabilia'))}
                    >
                      <Feather name="external-link" size={14} color="#FFD700" />
                      <Text style={styles.toolText}>eBay Sold</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {!['tradingCard', 'coin', 'comicBook', 'sportsMemorabilia'].includes(subcategory) && (
                <View style={styles.toolGroup}>
                  <View style={styles.toolList}>
                    <Pressable 
                      style={styles.toolItem}
                      onPress={() => openTool(getToolUrl('eBay Sold Listings (filter by "Sold")', 'general'))}
                    >
                      <Feather name="external-link" size={14} color="#FFD700" />
                      <Text style={styles.toolText}>eBay Sold Listings (filter by "Sold")</Text>
                    </Pressable>
                    <Pressable 
                      style={styles.toolItem}
                      onPress={() => openTool(getToolUrl('WorthPoint', 'general'))}
                    >
                      <Feather name="external-link" size={14} color="#FFD700" />
                      <Text style={styles.toolText}>WorthPoint</Text>
                    </Pressable>
                  </View>
                </View>
              )}
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
        ) : (
          <>
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
          </>
        )}

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

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.errorModalContent]}>
            <View style={styles.errorIconContainer}>
              <Feather name="alert-circle" size={32} color="#ff4444" />
            </View>
            <Text style={styles.modalTitle}>Error</Text>
            <Text style={styles.modalSubtitle}>{errorMessage}</Text>
            <Pressable 
              style={[styles.modalBtn, styles.modalCancelBtn]}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.modalBtnText}>OK</Text>
            </Pressable>
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#001a35',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  errorModalContent: {
    alignItems: 'center',
  },
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
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
    borderRadius: 12,
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
  guidanceHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 24,
  },
  guidanceIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 0,
  },
  guidanceTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 0,
    paddingHorizontal: 8,
  },
  guidanceSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  toolsSection: {
    marginTop: 8,
  },
  toolsSectionTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 16,
  },
  toolGroup: {
    marginBottom: 20,
  },
  toolGroupTitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 12,
  },
  toolList: {
    gap: 10,
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  toolText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
  },
});
