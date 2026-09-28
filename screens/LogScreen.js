import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ScrollView,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  categories,
  subcategoryOptions,
  conditionOptions,
} from '../constants/itemMetadata';
import { calculateValuation, formatMoney } from '../utils/valuation';
import { smartLog } from '../utils/smartLogService';
import { scaleFont, scaleSize, getScreenDimensions } from '../utils/responsive';

const LOADING_MESSAGES = [
  'Sizing it up...',
  'Checking current eBay listings...',
  'Crunching the numbers...',
];

export default function LogScreen({ navigation, route }) {
  const { fromSpot } = route.params || {};

  const [mode, setMode] = useState('smart'); // 'smart' | 'manual'

  // Smart entry state
  const [freeText, setFreeText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Manual wizard state
  const [step, setStep] = useState(1);
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [type, setType] = useState('modern'); // Default to modern
  const [condition, setCondition] = useState('');

  // Shared
  const [acquisitionCost, setAcquisitionCost] = useState('');

  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isParsing) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();

      const interval = setInterval(() => {
        setLoadingMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
      }, 1400);

      return () => clearInterval(interval);
    } else {
      spinAnim.setValue(0);
      setLoadingMessageIndex(0);
    }
  }, [isParsing]);

  const handleSmartSubmit = async () => {
    const trimmed = freeText.trim();
    if (!trimmed || isParsing) return;

    setParseError(null);
    setIsParsing(true);

    try {
      const result = await smartLog(trimmed);

      if (!result || result.capped) {
        setParseError(
          result?.capped
            ? "You've hit today's smart-log limit — log it manually for now."
            : "Couldn't quite figure out what that is — try logging it manually instead."
        );
        return;
      }

      navigation.navigate('Estimate', {
        isGeneric: true,
        condition: result.condition,
        itemName: result.itemName,
        acquisitionCost: Number(acquisitionCost) || 0,
        source: fromSpot || 'Custom Entry',
        marketPrice: result.marketPrice,
        marketSampleSize: result.marketSampleSize,
      });
    } catch (e) {
      setParseError('Something went wrong — try logging it manually instead.');
    } finally {
      setIsParsing(false);
    }
  };

  const switchToManual = () => {
    setParseError(null);
    setMode('manual');
  };

  // Live Valuation Calculation (manual mode only)
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
    if (mode === 'manual' && step > 1) setStep(step - 1);
    else if (mode === 'manual' && step === 1) setMode('smart');
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

  const renderSmartEntry = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What did you find?</Text>
      <View style={styles.inputGroup}>
        <TextInput
          style={[styles.textInput, styles.freeTextInput]}
          placeholder="e.g. Vintage leather jacket, small tear on the sleeve"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={freeText}
          onChangeText={setFreeText}
          multiline
          keyboardAppearance="dark"
        />
      </View>

      <View style={styles.inputGroup}>
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

      {parseError && (
        <Text style={styles.errorText}>{parseError}</Text>
      )}

      <Pressable onPress={switchToManual} style={styles.manualLink}>
        <Text style={styles.manualLinkText}>Or log it manually</Text>
      </Pressable>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Pressable onPress={() => setMode('smart')} style={styles.backToSmartLink}>
        <Feather name="zap" size={scaleSize(12)} color="#FFD700" />
        <Text style={styles.backToSmartText}>Back to smart entry</Text>
      </Pressable>

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
        {(category === 'electronics' || category === 'tools'
          ? ['modern', 'refurbished', 'damaged']
          : ['vintage', 'modern', 'refurbished', 'damaged']
        ).map((t) => (
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
        ))}
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

        {mode === 'manual' && renderStepIndicator()}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {fromSpot && (mode === 'smart' || step === 1) && (
            <View style={styles.spotInfo}>
              <Feather name="map-pin" size={scaleSize(14)} color="#FFD700" />
              <Text style={styles.spotText} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.8}>
                Found at: {fromSpot}
              </Text>
            </View>
          )}

          {mode === 'smart' && renderSmartEntry()}
          {mode === 'manual' && step === 1 && renderStep1()}
          {mode === 'manual' && step === 2 && renderStep2()}
          {mode === 'manual' && step === 3 && renderStep3()}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {mode === 'smart' ? (
            <Pressable
              style={[styles.nextBtn, (!freeText.trim() || isParsing) && styles.disabledBtn]}
              onPress={handleSmartSubmit}
              disabled={!freeText.trim() || isParsing}
            >
              <Text style={styles.nextText}>Get Estimate</Text>
              <Feather name="arrow-right" size={scaleSize(18)} color="#001f3f" style={{ marginLeft: scaleSize(8) }} />
            </Pressable>
          ) : (
            <>
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
                      {formatMoney(liveValuation.lowProfit)} - {formatMoney(liveValuation.highProfit)}
                    </Text>
                  </View>
                  <View>
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
            </>
          )}
        </View>

        {isParsing && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <Animated.View
                style={{
                  transform: [{
                    rotate: spinAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  }],
                }}
              >
                <Feather name="loader" size={scaleSize(28)} color="#FFD700" />
              </Animated.View>
              <Text style={styles.loadingText}>{LOADING_MESSAGES[loadingMessageIndex]}</Text>
            </View>
          </View>
        )}
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
    paddingTop: scaleSize(20),
    paddingBottom: scaleSize(10),
    paddingHorizontal: scaleSize(24),
  },
  backButton: {
    padding: scaleSize(4),
  },
  title: {
    color: '#fff',
    fontSize: scaleFont(20),
    fontFamily: 'Poppins-SemiBold',
  },
  indicatorContainer: {
    flexDirection: 'row',
    gap: scaleSize(8),
    paddingHorizontal: scaleSize(24),
    marginTop: scaleSize(10),
    marginBottom: scaleSize(20),
  },
  indicator: {
    flex: 1,
    height: scaleSize(4),
    borderRadius: scaleSize(2),
  },
  indicatorActive: {
    backgroundColor: '#FFD700',
  },
  indicatorInactive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scrollContent: {
    paddingHorizontal: scaleSize(24),
    paddingTop: scaleSize(20),
    paddingBottom: scaleSize(120),
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: scaleFont(24),
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    marginBottom: scaleSize(24),
  },
  spotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.1)',
    padding: scaleSize(12),
    borderRadius: scaleSize(12),
    marginBottom: scaleSize(24),
    gap: scaleSize(8),
  },
  spotText: {
    color: '#FFD700',
    fontFamily: 'Poppins-Regular',
    fontSize: scaleFont(13),
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: scaleFont(13),
    fontFamily: 'Poppins-SemiBold',
    marginBottom: scaleSize(8),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputGroup: {
    marginBottom: scaleSize(32),
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: scaleSize(12),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: scaleSize(16),
    color: '#fff',
    fontSize: scaleFont(16),
    fontFamily: 'Poppins-Regular',
  },
  freeTextInput: {
    minHeight: scaleSize(100),
    textAlignVertical: 'top',
  },
  inputHint: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: scaleFont(12),
    marginTop: scaleSize(8),
    fontFamily: 'Poppins-Regular',
  },
  errorText: {
    color: '#ff4444',
    fontSize: scaleFont(13),
    fontFamily: 'Poppins-Regular',
    marginBottom: scaleSize(20),
    lineHeight: scaleSize(18),
  },
  manualLink: {
    alignItems: 'center',
    paddingVertical: scaleSize(8),
  },
  manualLinkText: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(13),
  },
  backToSmartLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSize(6),
    marginBottom: scaleSize(20),
  },
  backToSmartText: {
    color: '#FFD700',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(12),
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleSize(12),
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 16, 32, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    backgroundColor: '#001a35',
    borderRadius: scaleSize(20),
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    paddingVertical: scaleSize(28),
    paddingHorizontal: scaleSize(32),
    alignItems: 'center',
    gap: scaleSize(16),
  },
  loadingText: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(14),
    textAlign: 'center',
  },
});
