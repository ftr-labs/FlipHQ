// Made by JN at studioFTR
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as InAppPurchases from 'expo-in-app-purchases';
import { addTokens } from './utils/tokenManager';
import { iapEmitter } from './utils/iapEvents';
import { isTransactionProcessed, markTransactionProcessed } from './utils/transactionManager';
import ErrorBoundary from './components/ErrorBoundary';
import AppNavigator from './navigation/AppNavigator';

SplashScreen.preventAutoHideAsync();

const fetchFonts = () =>
  Font.loadAsync({
    'Poppins-Regular': require('./assets/fonts/Poppins-Regular.ttf'),
    'Poppins-SemiBold': require('./assets/fonts/Poppins-SemiBold.ttf'),
  });

export default function App() {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);

  React.useEffect(() => {
    fetchFonts().then(() => setFontsLoaded(true));
  }, []);

  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Global IAP Purchase Listener - REQUIRED by Apple/StoreKit
  // Purchase results are delivered asynchronously via this listener, NOT as return values
  React.useEffect(() => {
    let isMounted = true;

    const setupPurchaseListener = async () => {
      try {
        // Connect to store
        await InAppPurchases.connectAsync();
        
        if (__DEV__) {
          console.log('IAP: Connected to store');
        }

        // Set global purchase listener - MUST be set before any purchases
        InAppPurchases.setPurchaseListener(async ({ responseCode, results, errorCode }) => {
          if (__DEV__) {
            console.log('IAP Purchase Listener:', { responseCode, results, errorCode });
          }

          if (responseCode === InAppPurchases.IAPResponseCode.OK) {
            // Purchase successful - process each purchase
            // CRITICAL: Use for...of instead of forEach to properly handle async operations
            if (results && results.length > 0) {
              for (const purchase of results) {
                // Only process unacknowledged purchases
                if (!purchase.acknowledged) {
                  try {
                    // CRITICAL: Check if this transaction has already been processed
                    // Apple can re-deliver transactions on app restart
                    const orderId = purchase.orderId;
                    if (orderId) {
                      const alreadyProcessed = await isTransactionProcessed(orderId);
                      if (alreadyProcessed) {
                        if (__DEV__) {
                          console.log(`IAP: Transaction ${orderId} already processed, skipping token grant`);
                        }
                        // Still finish the transaction to acknowledge it
                        await InAppPurchases.finishTransactionAsync(purchase, true);
                        // Emit success event so UI can reset (tokens already granted previously)
                        iapEmitter.emit('purchaseSuccess', {
                          productId: purchase.productId,
                          tokensAdded: 0, // Already granted, no new tokens
                          alreadyProcessed: true
                        });
                        continue; // Skip token grant but finish transaction and reset UI
                      }
                    }

                    // Grant tokens based on product ID
                    let tokensToAdd = 0;
                    switch (purchase.productId) {
                      case 'com.flipworthy.starterpack':
                        tokensToAdd = 10;
                        break;
                      case 'com.flipworthy.hustlerpack':
                        tokensToAdd = 35;
                        break;
                      case 'com.flipworthy.propack':
                        tokensToAdd = 80;
                        break;
                      default:
                        if (__DEV__) {
                          console.warn('Unknown product ID:', purchase.productId);
                        }
                        break;
                    }

                    if (tokensToAdd > 0) {
                      await addTokens(tokensToAdd);
                      if (__DEV__) {
                        console.log(`IAP: Granted ${tokensToAdd} tokens for ${purchase.productId}`);
                      }
                    }

                    // Mark transaction as processed BEFORE finishing (to prevent race conditions)
                    if (orderId) {
                      await markTransactionProcessed(orderId);
                    }

                    // REQUIRED: Finish transaction to prevent Apple rejection
                    await InAppPurchases.finishTransactionAsync(purchase, true);
                    
                    if (__DEV__) {
                      console.log('IAP: Transaction finished for', purchase.productId);
                    }

                    // Emit success event for UI to update (after transaction is finished)
                    iapEmitter.emit('purchaseSuccess', { 
                      productId: purchase.productId,
                      tokensAdded: tokensToAdd 
                    });
                  } catch (error) {
                    if (__DEV__) {
                      console.error('IAP: Error processing purchase:', error);
                    }
                    // Still try to finish transaction even if token grant fails
                    try {
                      await InAppPurchases.finishTransactionAsync(purchase, true);
                    } catch (finishError) {
                      if (__DEV__) {
                        console.error('IAP: Error finishing transaction:', finishError);
                      }
                    }
                    // Emit error event so UI can reset state
                    iapEmitter.emit('purchaseError', {
                      productId: purchase.productId,
                      error: error.message || 'Failed to process purchase',
                      type: 'processing_error'
                    });
                  }
                }
              }
            }
          } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
            // User canceled - emit event so UI can reset state
            if (__DEV__) {
              console.log('IAP: User canceled purchase');
            }
            iapEmitter.emit('purchaseCanceled', {
              message: 'Purchase was canceled'
            });
          } else if (responseCode === InAppPurchases.IAPResponseCode.DEFERRED) {
            // Purchase deferred (iOS only - family sharing)
            if (__DEV__) {
              console.log('IAP: Purchase deferred (pending approval)');
            }
            // Emit event for UI to show deferred message
            iapEmitter.emit('purchaseDeferred', {
              message: 'Your purchase is pending approval. You will receive tokens once approved.'
            });
          } else {
            // Other error - emit event so UI can reset state
            if (__DEV__) {
              console.error('IAP: Purchase error:', errorCode);
            }
            iapEmitter.emit('purchaseError', {
              error: `Purchase failed with code: ${errorCode}`,
              errorCode: errorCode,
              type: 'storekit_error'
            });
          }
        });

        if (__DEV__) {
          console.log('IAP: Purchase listener set');
        }
      } catch (error) {
        if (__DEV__) {
          console.error('IAP: Failed to setup purchase listener:', error);
        }
      }
    };

    setupPurchaseListener();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      // Note: We don't disconnect here as the listener should stay active
      // Disconnecting would break the purchase flow
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </ErrorBoundary>
  );
}
