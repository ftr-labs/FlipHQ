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

  // Global IAP Purchase Listener - SOURCE OF TRUTH
  // Connect once, set listener once, process all purchases here
  React.useEffect(() => {
    const setupPurchaseListener = async () => {
      try {
        // Connect to store ONCE on app start
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
            // Process each purchase
            if (results && results.length > 0) {
              for (const purchase of results) {
                try {
                  // Only process PURCHASED state
                  if (purchase.purchaseState !== InAppPurchases.InAppPurchaseState.PURCHASED) {
                    if (__DEV__) {
                      console.log(`IAP: Purchase ${purchase.productId} state: ${purchase.purchaseState}, skipping`);
                    }
                    continue;
                  }

                  // Skip already acknowledged purchases
                  if (purchase.acknowledged) {
                    if (__DEV__) {
                      console.log(`IAP: Purchase ${purchase.productId} already acknowledged`);
                    }
                    continue;
                  }

                  // Prevent duplicate token grants using order ID
                  const orderId = purchase.orderId;
                  if (orderId) {
                    const alreadyProcessed = await isTransactionProcessed(orderId);
                    if (alreadyProcessed) {
                      if (__DEV__) {
                        console.log(`IAP: Transaction ${orderId} already processed`);
                      }
                      await InAppPurchases.finishTransactionAsync(purchase, true);
                      iapEmitter.emit('purchaseSuccess', {
                        productId: purchase.productId,
                        tokensAdded: 0,
                        alreadyProcessed: true
                      });
                      continue;
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
                        console.warn('IAP: Unknown product ID:', purchase.productId);
                      }
                      await InAppPurchases.finishTransactionAsync(purchase, true);
                      iapEmitter.emit('purchaseError', {
                        productId: purchase.productId,
                        error: 'Unknown product ID',
                        type: 'processing_error'
                      });
                      continue;
                  }

                  // Grant tokens
                  if (tokensToAdd > 0) {
                    await addTokens(tokensToAdd);
                    if (__DEV__) {
                      console.log(`IAP: Granted ${tokensToAdd} tokens for ${purchase.productId}`);
                    }
                  }

                  // Mark transaction as processed
                  if (orderId) {
                    await markTransactionProcessed(orderId);
                  }

                  // Finish transaction
                  await InAppPurchases.finishTransactionAsync(purchase, true);
                  
                  if (__DEV__) {
                    console.log('IAP: Transaction finished for', purchase.productId);
                  }

                  // Emit success event
                  iapEmitter.emit('purchaseSuccess', {
                    productId: purchase.productId,
                    tokensAdded: tokensToAdd
                  });
                } catch (error) {
                  if (__DEV__) {
                    console.error('IAP: Error processing purchase:', error);
                  }
                  try {
                    await InAppPurchases.finishTransactionAsync(purchase, true);
                  } catch (finishError) {
                    if (__DEV__) {
                      console.error('IAP: Error finishing transaction:', finishError);
                    }
                  }
                  iapEmitter.emit('purchaseError', {
                    productId: purchase.productId,
                    error: error.message || 'Failed to process purchase',
                    type: 'processing_error'
                  });
                }
              }
            }
          } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
            if (__DEV__) {
              console.log('IAP: User canceled purchase');
            }
            iapEmitter.emit('purchaseCanceled', {});
          } else if (responseCode === InAppPurchases.IAPResponseCode.DEFERRED) {
            if (__DEV__) {
              console.log('IAP: Purchase deferred');
            }
            iapEmitter.emit('purchaseDeferred', {
              message: 'Your purchase is pending approval. You will receive tokens once approved.'
            });
          } else {
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

    // Cleanup: Disconnect StoreKit when app unmounts
    return () => {
      InAppPurchases.disconnectAsync().catch((error) => {
        if (__DEV__) {
          console.error('IAP: Error disconnecting from store:', error);
        }
      });
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
