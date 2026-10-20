// src/components/ThemedText.tsx
import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface ThemedTextProps {
  children: React.ReactNode;
  style?: TextStyle;
  type?: 'title' | 'subtitle' | 'body' | 'small';
  color?: string;
}

export default function ThemedText({ children, style, type = 'body', color }: ThemedTextProps) {
  const { colors } = useTheme();
  
  const getTypeStyle = () => {
    switch (type) {
      case 'title':
        return { fontSize: 24, fontWeight: '800' as const };
      case 'subtitle':
        return { fontSize: 18, fontWeight: '700' as const };
      case 'small':
        return { fontSize: 12 };
      default:
        return { fontSize: 14 };
    }
  };
  
  return (
    <Text style={[{ color: color || colors.text }, getTypeStyle(), style]}>
      {children}
    </Text>
  );
}