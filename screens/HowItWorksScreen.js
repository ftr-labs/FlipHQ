// HowItWorksScreen.js — Pro Visual Roadmap
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  Pressable 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { scaleFont, scaleSize, getResponsiveValue } from '../utils/responsive';

const steps = [
  {
    title: 'FIND',
    icon: 'search',
    color: '#1E90FF',
    body: 'Discover flip-worthy items around you — thrift stores, garage sales, and pawn shops. Use our area scanner to uncover hidden gems.',
  },
  {
    title: 'LOG + VALUE',
    icon: 'edit-2',
    color: '#FFD700',
    body: 'Spotted something? Log it instantly. Pick a category and we’ll tell you what it\'s worth now vs. after a fix with real market ranges.',
  },
  {
    title: 'FIX',
    icon: 'tool',
    color: '#32CD32',
    body: 'Don\'t guess. We provide one-tap access to YouTube repair guides and a professional toolkit tailored to your specific item.',
  },
  {
    title: 'FLIP',
    icon: 'dollar-sign',
    color: '#FFA500',
    body: 'Sell it smart. Compare marketplaces like eBay vs. FB Marketplace and follow our Pro Listing checklist to maximize your profit.',
  },
  {
    title: 'MY FINDS',
    icon: 'box',
    color: '#9370DB',
    body: 'Monitor your hustle. Track your inventory from "Found" to "Flipped" and watch your total earned profit grow.',
  },
  {
    title: 'FLIPBOT',
    icon: 'message-circle',
    color: '#FF69B4',
    body: 'Your AI sidekick. Get sassy advice, deep-dive valuations, and strategic tips to help you make the most of every find.',
  },
  {
    title: 'SECURE',
    icon: 'shield',
    color: '#00FA9A',
    body: 'No accounts. No ads. Your data is stored privately on your phone. If you delete the app, your info is gone forever. Clean and lean.',
  },
];

export default function HowItWorksScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={scaleSize(24)} color="#FFD700" />
        </Pressable>
        <Text style={styles.headerTitle}>Hustle Roadmap</Text>
        <View style={{ width: scaleSize(24) }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pipelineContainer}>
          {/* Vertical Line */}
          <View style={styles.verticalLine} />

          {steps.map((step, index) => (
            <View key={index} style={styles.stepWrapper}>
              {/* Dot / Icon */}
              <View style={[styles.iconCircle, { borderColor: step.color }]}>
                <Feather name={step.icon} size={scaleSize(18)} color={step.color} />
              </View>

              {/* Content Card */}
              <View style={styles.card}>
                <Text style={[styles.stepTitle, { color: step.color }]}>{step.title}</Text>
                <Text style={styles.stepBody}>{step.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Ready to start your hunt?</Text>
          <Pressable 
            style={styles.ctaBtn}
            onPress={() => {
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                })
              );
            }}
          >
            <Text style={styles.ctaBtnText}>Get Started</Text>
          </Pressable>
        </View>
      </ScrollView>
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
    paddingHorizontal: scaleSize(24),
    paddingVertical: scaleSize(20),
  },
  backButton: {
    padding: scaleSize(4),
  },
  headerTitle: {
    color: '#fff',
    fontSize: scaleFont(20),
    fontFamily: 'Poppins-SemiBold',
  },
  scrollContent: {
    paddingHorizontal: scaleSize(24),
    paddingTop: scaleSize(20),
    paddingBottom: scaleSize(60),
  },
  pipelineContainer: {
    position: 'relative',
    paddingLeft: scaleSize(20),
  },
  verticalLine: {
    position: 'absolute',
    left: scaleSize(19),
    top: 0,
    bottom: scaleSize(40),
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  stepWrapper: {
    flexDirection: 'row',
    marginBottom: scaleSize(32),
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: scaleSize(40),
    height: scaleSize(40),
    borderRadius: scaleSize(20),
    backgroundColor: '#001a35',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    marginRight: scaleSize(20),
  },
  card: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: scaleSize(16),
    padding: scaleSize(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  stepTitle: {
    fontSize: scaleFont(14),
    fontFamily: 'Poppins-SemiBold',
    marginBottom: scaleSize(8),
    letterSpacing: 1,
  },
  stepBody: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: scaleFont(14),
    fontFamily: 'Poppins-Regular',
    lineHeight: scaleSize(22),
  },
  footer: {
    marginTop: scaleSize(20),
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: 'Poppins-Regular',
    fontSize: scaleFont(14),
    marginBottom: scaleSize(16),
  },
  ctaBtn: {
    backgroundColor: '#FFD700',
    paddingVertical: scaleSize(14),
    paddingHorizontal: scaleSize(40),
    borderRadius: scaleSize(12),
  },
  ctaBtnText: {
    color: '#001f3f',
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(15),
  },
});
