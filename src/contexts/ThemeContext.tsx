// src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceLight: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryDark: string;
  success: string;
  error: string;
  warning: string;
  border: string;
  card: string;
};

type ThemeContextType = {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
};

const lightColors: ThemeColors = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceLight: '#F0F0F0',
  text: '#1A1A1A',
  textSecondary: '#666666',
  primary: '#0EA5E9',
  primaryDark: '#0284C7',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  border: '#E5E5E5',
  card: '#FFFFFF',
};

const darkColors: ThemeColors = {
  background: '#080B14',
  surface: '#0D1829',
  surfaceLight: '#162236',
  text: '#FFFFFF',
  textSecondary: '#3A6B8A',
  primary: '#0EA5E9',
  primaryDark: '#0284C7',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  border: '#162236',
  card: '#0D1829',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('app-theme');
        if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
          setMode(savedTheme);
        }
      } catch (error) {
        console.log('Error loading theme:', error);
      }
    };
    loadTheme();
  }, []);

  const saveTheme = async (newMode: ThemeMode) => {
    setMode(newMode);
    try {
      await AsyncStorage.setItem('app-theme', newMode);
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  const getEffectiveTheme = (): 'light' | 'dark' => {
    if (mode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return mode === 'dark' ? 'dark' : 'light';
  };

  const isDark = getEffectiveTheme() === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, colors, setMode: saveTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};