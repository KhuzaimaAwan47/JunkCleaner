import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DefaultTheme, useTheme } from 'styled-components/native';
import { withOpacity } from '../theme/theme';

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
      <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.colors.error} />
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      padding: theme.spacing.sm,
      borderRadius: theme.radii.lg,
      backgroundColor: withOpacity(theme.colors.error, 0.1),
      borderWidth: 1,
      borderColor: withOpacity(theme.colors.error, 0.4),
    },
    errorText: {
      color: theme.colors.error,
      flex: 1,
      fontSize: theme.fontSize.sm,
    },
  });

export default ErrorBanner;

