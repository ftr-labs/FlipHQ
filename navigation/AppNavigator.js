// AppNavigator.js — Updated with LogScreen instead of SettingsScreen
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import FindScreen from '../screens/FindScreen';
import FixScreen from '../screens/FixScreen';
import FlipScreen from '../screens/FlipScreen';
import MyFindsScreen from '../screens/MyFindsScreen';
import HowItWorksScreen from '../screens/HowItWorksScreen';
import LogScreen from '../screens/LogScreen'; 
import EstimateScreen from '../screens/EstimateScreen';
import FlipBotScreen from '../screens/FlipBotScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Find" component={FindScreen} />
      <Stack.Screen name="Log" component={LogScreen} />
      <Stack.Screen name="Fix" component={FixScreen} />
      <Stack.Screen name="Flip" component={FlipScreen} />
      <Stack.Screen name="MyFinds" component={MyFindsScreen} />
      <Stack.Screen name="HowItWorks" component={HowItWorksScreen} />
      <Stack.Screen name="Estimate" component={EstimateScreen} />
      <Stack.Screen name="FlipBot" component={FlipBotScreen} />
    </Stack.Navigator>
  );
}
