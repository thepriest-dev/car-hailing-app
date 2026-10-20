import { SafeAreaView, Platform, StatusBar, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  excludeTop?: boolean;
  excludeBottom?: boolean;
}

export default function SafeAreaWrapper({ 
  children, 
  style, 
  excludeTop = false, 
  excludeBottom = false 
}: SafeAreaWrapperProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  // For Android, we need to handle the navigation bar and status bar
  const paddingTop = Platform.OS === 'android' && !excludeTop 
    ? StatusBar.currentHeight || insets.top 
    : insets.top;
    
  const paddingBottom = Platform.OS === 'android' && !excludeBottom 
    ? insets.bottom 
    : insets.bottom;

  return (
    <SafeAreaView 
      style={[
        styles.container, 
        { 
          backgroundColor: colors.background,
          paddingTop,
          paddingBottom,
        }, 
        style
      ]}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});