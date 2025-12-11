import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DefaultTheme, useTheme } from 'styled-components/native';
import ScanActionButton from './ScanActionButton';
import ScanProgressCard from './ScanProgressCard';

type WhatsAppEmptyStateProps = {
  loading: boolean;
  hasFiles: boolean;
  hasSavedResults: boolean;
  onScan?: () => void;
};

const WhatsAppEmptyState: React.FC<WhatsAppEmptyStateProps> = ({
  loading,
  hasFiles,
  hasSavedResults,
  onScan,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.emptyCard}>
      {loading ? (
        <ScanProgressCard
          title="scanning whatsapp folders"
          subtitle="sit tight while we index your chats and media."
        />
      ) : (
        <>
          <Text style={styles.emptyTitle}>
            {hasFiles ? 'no files in this filter' : 'ready to clean whatsapp clutter'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {hasFiles
              ? 'try switching to another media type.'
              : 'tap rescan to fetch images, audio, and docs instantly.'}
          </Text>
          {!hasFiles && onScan && (
            <ScanActionButton label={hasSavedResults ? 'Rescan' : 'Start scan'} onPress={onScan} fullWidth />
          )}
        </>
      )}
    </View>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    emptyCard: {
      marginTop: theme.spacing.lg,
      padding: theme.spacing.lg,
      borderRadius: theme.radii.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    emptyTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    emptySubtitle: {
      color: theme.colors.textMuted,
      textAlign: 'center',
      fontSize: 13,
    },
  });

export default WhatsAppEmptyState;

