// FTR
// Responsive utility functions for scaling across different screen sizes
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base width for scaling (iPhone SE - smallest common iPhone)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 667;

// Screen size categories
export const getScreenSize = () => {
  if (SCREEN_WIDTH < 375) return 'small'; // iPhone SE and smaller
  if (SCREEN_WIDTH <= 414) return 'medium'; // iPhone 8, X, 11, 12, 13, 14
  return 'large'; // iPhone 14 Pro Max, 15 Pro Max, etc.
};

// Scale font size based on screen width
export const scaleFont = (size) => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  
  // Round to nearest 0.5 for better rendering
  return Math.round(newSize * 2) / 2;
};

// Scale dimensions (padding, margins, widths, heights)
export const scaleSize = (size) => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(size * scale);
};

// Get responsive value based on screen size
export const getResponsiveValue = (small, medium, large) => {
  const screenSize = getScreenSize();
  if (screenSize === 'small') return small;
  if (screenSize === 'large') return large;
  return medium;
};

// Scale height-based dimensions (for vertical spacing)
export const scaleHeight = (size) => {
  const scale = SCREEN_HEIGHT / BASE_HEIGHT;
  return Math.round(size * scale);
};

// Get screen dimensions
export const getScreenDimensions = () => ({
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
});

// Check if screen is small
export const isSmallScreen = () => SCREEN_WIDTH < 375;

// Check if screen is large
export const isLargeScreen = () => SCREEN_WIDTH > 414;

