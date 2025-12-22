import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ScrollView,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  categories,
  subcategoryOptions,
  conditionOptions,
} from '../constants/itemMetadata';
import { calculateValuation } from '../utils/valuation';
import { scaleFont, scaleSize, getScreenDimensions } from '../utils/responsive';

export default function LogScreen({ navigation, route }) {
  const { fromSpot } = route.params || {};
  
  const [step, setStep] = useState(1);
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [type, setType] = useState('modern'); // Default to modern
  const [condition, setCondition] = useState('');
  const [acquisitionCost, setAcquisitionCost] = useState('');

  // Live Valuation Calculation
  const liveValuation = useMemo(() => {
    if (!subcategory || !type || !category) return null;
    return calculateValuation({
      category,
      subcategory,
      type,
      condition: condition || 'None of the above',
      acquisitionCost: acquisitionCost || 0,
    });
  }, [category, subcategory, type, condition, acquisitionCost]);

  const canGoNext = () => {
    if (step === 1) return itemName.trim().length > 0 && category;
    if (step === 2) return subcategory && type;
    if (step === 3) return condition;
    return false;
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      navigation.navigate('Estimate', {
        category,
        subcategory,
        type,
        condition,
        itemName,
        acquisitionCost: Number(acquisitionCost) || 0,
        source: fromSpot || 'Custom Entry',
      });
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  };

  const renderStepIndicator = () => (
    <View style={styles.indicatorContainer}>
      {[1, 2, 3].map((s) => (
        <View 
          key={s} 
          style={[
            styles.indicator, 
            s <= step ? styles.indicatorActive : styles.indicatorInactive
          ]} 
        />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What did you find?</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Item Name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Vintage Leather Jacket"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={itemName}
          onChangeText={setItemName}
          keyboardAppearance="dark"
        />
      </View>

      <Text style={styles.label}>Select Category</Text>
      <View style={styles.categoryGrid}>
        {categories.map((cat) => (
          <Pressable
            key={cat.value}
            style={[
              styles.categoryCard,
              category === cat.value && styles.categoryCardSelected
            ]}
            onPress={() => {
              setCategory(cat.value);
              setSubcategory(''); // Reset subcategory if category changes
            }}
          >
            <View
              style={[
                styles.categoryContent,
                category === cat.value ? styles.categoryContentSelected : styles.categoryContentUnselected
              ]}
            >
              <Feather 
                name={cat.icon} 
                size={scaleSize(24)} 
                color={category === cat.value ? '#001f3f' : '#FFD700'} 
              />
              <Text style={[
                styles.categoryLabel,
                category === cat.value && styles.categoryLabelSelected
              ]}>
                {cat.label}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Refine the details</Text>
      
      <Text style={styles.label}>Subcategory</Text>
      <View style={styles.chipContainer}>
        {subcategoryOptions[category]?.map((sub) => (
          <Pressable
            key={sub.value}
            style={[
              styles.chip,
              subcategory === sub.value && styles.chipSelected
            ]}
            onPress={() => setSubcategory(sub.value)}
          >
            <Text style={[
              styles.chipText,
              subcategory === sub.value && styles.chipTextSelected
            ]}>
              {sub.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { marginTop: scaleSize(24) }]}>Type</Text>
      <View style={styles.chipContainer}>
        {(() => {
          // Filter type options based on category
          let availableTypes = [];
          
          if (category === 'electronics' || category === 'tools') {
            // Electronics/Tools: modern, refurbished, damaged only
            // Vintage only for specific vintage electronics (handled in getTypeMultiplier)
            availableTypes = ['modern', 'refurbished', 'damaged'];
          } else if (category === 'furniture' || category === 'clothing' || category === 'decor' || category === 'collectibles') {
            // Furniture/Clothing/Decor/Collectibles: all types including vintage
            availableTypes = ['vintage', 'modern', 'refurbished', 'damaged'];
          } else {
            // Default: all types
            availableTypes = ['vintage', 'modern', 'refurbished', 'damaged'];
          }
          
          return availableTypes.map((t) => (
            <Pressable
              key={t}
              style={[
                styles.chip,
                type === t && styles.chipSelected
              ]}
              onPress={() => setType(t)}
            >
              <Text style={[
                styles.chipText,
                type === t && styles.chipTextSelected
              ]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </Pressable>
          ));
        })()}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Condition & Cost</Text>
      
      <Text style={styles.label}>What's wrong with it? (Condition)</Text>
      <View style={styles.chipContainer}>
        {conditionOptions[subcategory]?.map((cond) => (
          <Pressable
            key={cond}
            style={[
              styles.chip,
              condition === cond && styles.chipSelected
            ]}
            onPress={() => setCondition(cond)}
          >
            <Text style={[
              styles.chipText,
              condition === cond && styles.chipTextSelected
            ]}>
              {cond}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.inputGroup, { marginTop: scaleSize(32) }]}>
        <Text style={styles.label}>Acquisition Cost ($)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="0.00"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={acquisitionCost}
          onChangeText={setAcquisitionCost}
          keyboardType="numeric"
          keyboardAppearance="dark"
        />
        <Text style={styles.inputHint}>How much did you pay for this treasure?</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Feather name="arrow-left" size={scaleSize(24)} color="#FFD700" />
          </Pressable>
          <Text style={styles.title}>Log Item</Text>
          <View style={{ width: scaleSize(24) }} />
        </View>

        {renderStepIndicator()}

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          {fromSpot && step === 1 && (
            <View style={styles.spotInfo}>
              <Feather name="map-pin" size={scaleSize(14)} color="#FFD700" />
              <Text style={styles.spotText} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.8}>
                Found at: {fromSpot}
              </Text>
            </View>
          )}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </ScrollView>

        {/* Live Ticker Footer */}
        <View style={styles.footer}>
          {liveValuation && category === 'collectibles' ? (
            <View style={styles.ticker}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tickerLabel}>Collectibles Valuation</Text>
                <Text style={[styles.tickerValue, { color: '#FFD700', fontSize: scaleFont(14) }]}>
                  Use specialized tools for accurate pricing
                </Text>
              </View>
            </View>
          ) : liveValuation ? (
            <View style={styles.ticker}>
              <View>
                <Text style={styles.tickerLabel}>Est. Profit Range</Text>
                <Text style={[
                  styles.tickerValue, 
                  { color: liveValuation.lowProfit >= 0 ? '#32CD32' : '#ff4444' }
                ]}>
                  ${liveValuation.lowProfit} - ${liveValuation.highProfit}
                </Text>
              </View>
              <View style={styles.tickerRating}>
                <Text style={styles.tickerRatingText}>
                  {'⭐'.repeat(liveValuation.rating).padEnd(5, '☆')}
                </Text>
              </View>
            </View>
          ) : null}
          
          <Pressable
            style={[styles.nextBtn, !canGoNext() && styles.disabledBtn]}
            onPress={handleNext}
            disabled={!canGoNext()}
          >
            <Text style={styles.nextText}>
              {step === 3 ? 'See Final Valuation' : 'Next Step'}
            </Text>
            <Feather 
              name={step === 3 ? 'check-circle' : 'arrow-right'} 
              size={scaleSize(18)} 
              color="#001f3f" 
              style={{ marginLeft: scaleSize(8) }} 
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 24,
  },
  backButton: {
    padding: 4,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
  },
  indicatorContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    marginTop: 10,
    marginBottom: 20,
  },
  indicator: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  indicatorActive: {
    backgroundColor: '#FFD700',
  },
  indicatorInactive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 24,
  },
  spotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  spotText: {
    color: '#FFD700',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputGroup: {
    marginBottom: 32,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
  inputHint: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginTop: 8,
    fontFamily: 'Poppins-Regular',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: (getScreenDimensions().width - scaleSize(48) - scaleSize(12)) / 2,
    borderRadius: scaleSize(16),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryCardSelected: {
    borderColor: '#FFD700',
  },
  categoryContent: {
    padding: scaleSize(20),
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaleSize(8),
  },
  categoryContentSelected: {
    backgroundColor: '#FFD700',
  },
  categoryContentUnselected: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  categoryLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(14),
  },
  categoryLabelSelected: {
    color: '#001f3f',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleSize(10),
  },
  chip: {
    paddingHorizontal: scaleSize(16),
    paddingVertical: scaleSize(10),
    borderRadius: scaleSize(10),
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipSelected: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderColor: '#FFD700',
  },
  chipText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Poppins-Regular',
    fontSize: scaleFont(14),
  },
  chipTextSelected: {
    color: '#FFD700',
    fontFamily: 'Poppins-SemiBold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#001a35',
    paddingHorizontal: scaleSize(24),
    paddingTop: scaleSize(16),
    paddingBottom: Platform.OS === 'ios' ? scaleSize(40) : scaleSize(20),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  ticker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSize(16),
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: scaleSize(12),
    borderRadius: scaleSize(12),
  },
  tickerLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: scaleFont(10),
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'uppercase',
  },
  tickerValue: {
    fontSize: scaleFont(20),
    fontFamily: 'Poppins-SemiBold',
  },
  tickerRatingText: {
    fontSize: scaleFont(18),
    letterSpacing: 2,
  },
  nextBtn: {
    backgroundColor: '#FFD700',
    flexDirection: 'row',
    paddingVertical: scaleSize(16),
    borderRadius: scaleSize(12),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextText: {
    color: '#001f3f',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(16),
  },
  disabledBtn: {
    opacity: 0.3,
  },
});
