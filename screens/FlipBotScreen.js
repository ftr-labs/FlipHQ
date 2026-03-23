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
import { sendMessageToFlipBot } from '../utils/aiService';
import { scaleFont, scaleSize } from '../utils/responsive';

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
  const flatListRef = useRef(null);
  const spinAnim = useRef(new Animated.Value(0)).current;

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
            <Feather name="message-circle" size={scaleSize(14)} color="#FFD700" />
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
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={scaleSize(24)} color="#FFD700" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>FlipBot</Text>
          <Text 
            style={styles.subtitle}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.7}
          >
            Your AI Sidekick
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

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
                    <Feather name="message-circle" size={scaleSize(16)} color="#FFD700" />
                  </Animated.View>
                  <Text style={[styles.messageText, styles.assistantMessageText, { marginLeft: scaleSize(10) }]}>
                    FlipBot is thinking...
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
    paddingTop: scaleSize(60),
    paddingBottom: scaleSize(20),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    padding: scaleSize(4),
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerSpacer: {
    width: scaleSize(36),
  },
  title: {
    color: '#fff',
    fontSize: scaleFont(24),
    fontFamily: 'Poppins-SemiBold',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: scaleFont(12),
    fontFamily: 'Poppins-Regular',
    marginTop: scaleSize(2),
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: scaleSize(24),
    paddingTop: scaleSize(20),
    paddingBottom: scaleSize(20),
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: scaleSize(16),
    alignItems: 'flex-end',
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: scaleSize(16),
    paddingVertical: scaleSize(12),
    borderRadius: scaleSize(18),
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
    fontSize: scaleFont(15),
    fontFamily: 'Poppins-Regular',
    lineHeight: scaleSize(20),
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: 'rgba(255,255,255,0.9)',
  },
  botIconContainer: {
    marginLeft: scaleSize(8),
    width: scaleSize(20),
    height: scaleSize(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrapper: {
    flexDirection: 'row',
    marginBottom: scaleSize(16),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: scaleSize(24),
    paddingVertical: Platform.OS === 'ios' ? scaleSize(12) : scaleSize(16),
    paddingBottom: Platform.OS === 'ios' ? scaleSize(12) : scaleSize(16),
    backgroundColor: '#001a35',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: scaleSize(12),
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: scaleSize(20),
    paddingHorizontal: scaleSize(16),
    paddingVertical: scaleSize(12),
    color: '#fff',
    fontSize: scaleFont(15),
    fontFamily: 'Poppins-Regular',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: scaleSize(100),
  },
  sendButton: {
    width: scaleSize(44),
    height: scaleSize(44),
    borderRadius: scaleSize(22),
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
});
