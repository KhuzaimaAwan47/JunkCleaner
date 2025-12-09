import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DefaultTheme, useTheme } from 'styled-components/native';

type ErrorBannerProps = {
  error: string;
  onDismiss?: () => void;
};

const ErrorBanner: React.FC<ErrorBannerProps> = ({ error, onDismiss }) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  if (!error) return null;

  return (
    <View style={styles.errorBanner}>
      <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#ff8484" />
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: theme.spacing.sm,
      borderRadius: theme.radii.lg,
      backgroundColor: 'rgba(255, 77, 79, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(255, 77, 79, 0.4)',
    },
    errorText: {
      color: '#ff8a8a',
      flex: 1,
    },
  });

export default ErrorBanner;

