import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface PasswordRequirementsProps {
  password: string;
  requirements: {
    minLength: number;
    requiresUppercase: boolean;
    requiresLowercase: boolean;
    requiresNumbers: boolean;
    requiresSpecialChars: boolean;
  };
}

export default function PasswordRequirements({ password, requirements }: PasswordRequirementsProps) {
  const { colors } = useTheme();
  
  const checks = [
    {
      label: `At least ${requirements.minLength} characters`,
      met: password.length >= requirements.minLength,
    },
    {
      label: 'At least one uppercase letter',
      met: /[A-Z]/.test(password),
      show: requirements.requiresUppercase,
    },
    {
      label: 'At least one lowercase letter',
      met: /[a-z]/.test(password),
      show: requirements.requiresLowercase,
    },
    {
      label: 'At least one number',
      met: /[0-9]/.test(password),
      show: requirements.requiresNumbers,
    },
    {
      label: 'At least one special character (!@#$%^&*)',
      met: /[^a-zA-Z0-9]/.test(password),
      show: requirements.requiresSpecialChars,
    },
  ];

  const visibleChecks = checks.filter(check => check.show !== false);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>Password Requirements:</Text>
      {visibleChecks.map((check, index) => (
        <View key={index} style={styles.checkRow}>
          <Text style={[styles.checkMark, { color: check.met ? colors.success : colors.error }]}>
            {check.met ? '✓' : '✗'}
          </Text>
          <Text style={[styles.checkLabel, { color: check.met ? colors.success : colors.error }]}>
            {check.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkMark: {
    fontSize: 12,
    marginRight: 8,
    width: 16,
  },
  checkLabel: {
    fontSize: 11,
  },
});