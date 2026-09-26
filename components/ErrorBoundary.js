import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { scaleFont, scaleSize } from '../utils/responsive';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Feather name="alert-circle" size={scaleSize(48)} color="#FF6B6B" />
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              We're sorry, but something unexpected happened. Please try again.
            </Text>
            {__DEV__ && this.state.error && (
              <Text style={styles.errorDetails}>
                {this.state.error.toString()}
              </Text>
            )}
            <Pressable style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>Try Again</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001f3f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scaleSize(24),
  },
  content: {
    alignItems: 'center',
    maxWidth: scaleSize(320),
  },
  title: {
    color: '#fff',
    fontSize: scaleFont(24),
    fontFamily: 'Poppins-SemiBold',
    marginTop: scaleSize(16),
    marginBottom: scaleSize(8),
    textAlign: 'center',
  },
  message: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: scaleFont(16),
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginBottom: scaleSize(24),
    lineHeight: scaleSize(22),
  },
  errorDetails: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: scaleFont(12),
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginBottom: scaleSize(24),
    padding: scaleSize(12),
    backgroundColor: 'rgba(255,0,0,0.1)',
    borderRadius: scaleSize(12),
  },
  button: {
    backgroundColor: '#FFD700',
    paddingHorizontal: scaleSize(32),
    paddingVertical: scaleSize(14),
    borderRadius: scaleSize(12),
  },
  buttonText: {
    color: '#001f3f',
    fontSize: scaleFont(16),
    fontFamily: 'Poppins-SemiBold',
  },
});

export default ErrorBoundary;
