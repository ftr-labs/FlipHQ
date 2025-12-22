// FlipBotScreen.js — Full AI Chat Interface
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import { sendMessageToFlipBot } from '../utils/aiService';
import { getTokens, deductToken, initializeTokens, refundToken } from '../utils/tokenManager';

const MESSAGES_PER_TOKEN = 3; // 1 token = 3 user messages (3 exchanges)

export default function FlipBotScreen({ navigation }) {
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'assistant',
      content: 'Hey hustler! 👋 I\'m FlipBot, your AI sidekick. What treasure are you eyeing today?',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenCount, setTokenCount] = useState(0);
  const [showOutOfTokens, setShowOutOfTokens] = useState(false);
  const [messagesInSession, setMessagesInSession] = useState(0); // Track user messages in current session
  const flatListRef = useRef(null);
  const spinAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      loadTokenCount();
      // Reset message count when screen comes into focus (new session)
      setMessagesInSession(0);
    }, [])
  );

  const loadTokenCount = async () => {
    await initializeTokens(); // Ensure initialized
    const count = await getTokens();
    setTokenCount(count);
    setShowOutOfTokens(count === 0);
  };

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    if (isLoading) {
      // Start rotation animation
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      // Reset animation
      spinAnim.setValue(0);
    }
  }, [isLoading]);

  const handleSend = async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText || isLoading) return;

    // Check if we need a new token for this message
    const needsNewToken = messagesInSession % MESSAGES_PER_TOKEN === 0;
    
    if (needsNewToken) {
      // Check tokens before proceeding
      const currentTokens = await getTokens();
      if (currentTokens < 1) {
        setShowOutOfTokens(true);
        return;
      }

      // Deduct token for new session of 3 messages
      const deducted = await deductToken();
      if (!deducted) {
        setShowOutOfTokens(true);
        await loadTokenCount();
        return;
      }

      await loadTokenCount(); // Update display
    }

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    // Increment message count
    const newMessageCount = messagesInSession + 1;
    setMessagesInSession(newMessageCount);

    try {
      // Build conversation history for context
      const conversationHistory = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      // Get FlipBot's response
      const response = await sendMessageToFlipBot(trimmedText, conversationHistory);

      // Add assistant message
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      // Only refund token if this was the first message in a new session
      if (needsNewToken) {
        await refundToken();
        await loadTokenCount();
        // Reset message count since we refunded
        setMessagesInSession(prev => Math.max(0, prev - 1));
      }

      // Show error message
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I'm having trouble right now: ${error.message}. Try again?`,
        timestamp: new Date(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    const isError = item.isError;

    return (
      <View style={[styles.messageWrapper, isUser && styles.userMessageWrapper]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          isError && styles.errorBubble
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.assistantMessageText
          ]}>
            {item.content}
          </Text>
        </View>
        {!isUser && (
          <View style={styles.botIconContainer}>
            <Feather name="message-circle" size={14} color="#FFD700" />
          </View>
        )}
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
        <View style={styles.headerCenter}>
          <Text style={styles.title}>FlipBot</Text>
          <Text style={styles.subtitle}>Your AI Sidekick</Text>
        </View>
        <View style={styles.tokenBadge}>
          <Feather name="zap" size={14} color="#FFD700" />
          <Text style={styles.tokenText}>{tokenCount}</Text>
        </View>
      </View>

      {showOutOfTokens ? (
        <View style={styles.outOfTokensContainer}>
          <View style={styles.outOfTokensCard}>
            <Feather name="zap" size={48} color="rgba(255,215,0,0.3)" />
            <Text style={styles.outOfTokensTitle}>Out of Tokens</Text>
            <Text style={styles.outOfTokensText}>
              You need tokens to chat with FlipBot. 1 token = 3 messages.
            </Text>
            <Pressable
              style={styles.refillButton}
              onPress={() => {
                // Will open refill modal - for now just navigate to home
                navigation.navigate('Home');
              }}
            >
              <Text style={styles.refillButtonText}>Refill Tokens</Text>
            </Pressable>
            <Pressable
              style={styles.backButtonOut}
              onPress={() => {
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Home' }],
                  })
                );
              }}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.chatContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isLoading ? (
              <View style={styles.loadingWrapper}>
                <View style={styles.assistantBubble}>
                  <Animated.View
                    style={{
                      transform: [
                        {
                          rotate: spinAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          }),
                        },
                      ],
                    }}
                  >
                    <Feather name="dollar-sign" size={16} color="#FFD700" />
                  </Animated.View>
                  <Text style={[styles.messageText, styles.assistantMessageText, { marginLeft: 10 }]}>
                    Calculating profit...
                  </Text>
                </View>
              </View>
            ) : null
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask FlipBot anything..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isLoading}
            keyboardAppearance="dark"
          />
          <Pressable
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <Feather 
              name="send" 
              size={18} 
              color={(!inputText.trim() || isLoading) ? 'rgba(255,255,255,0.3)' : '#001f3f'} 
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      )}
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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#003F91',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorBubble: {
    borderColor: 'rgba(255,68,68,0.3)',
  },
  messageText: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: 'rgba(255,255,255,0.9)',
  },
  botIconContainer: {
    marginLeft: 8,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: Platform.OS === 'ios' ? 12 : 16,
    backgroundColor: '#001a35',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    shadowOpacity: 0,
    elevation: 0,
  },
  tokenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    gap: 6,
  },
  tokenText: {
    color: '#FFD700',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  outOfTokensContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  outOfTokensCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    width: '100%',
    maxWidth: 400,
  },
  outOfTokensTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    marginTop: 20,
    marginBottom: 12,
  },
  outOfTokensText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  refillButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  refillButtonText: {
    color: '#001f3f',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  backButtonOut: {
    paddingVertical: 12,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
});
