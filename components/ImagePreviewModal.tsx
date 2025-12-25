import { Image } from 'expo-image';
import React from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DefaultTheme, useTheme } from 'styled-components/native';
import { ensurePreviewUri } from '../utils/fileUtils';

interface ImagePreviewModalProps {
  visible: boolean;
  imagePath: string | null;
  onClose: () => void;
}

export default function ImagePreviewModal({ visible, imagePath, onClose }: ImagePreviewModalProps) {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const previewUri = imagePath ? ensurePreviewUri(imagePath) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.touchArea} activeOpacity={1} onPress={onClose}>
          {previewUri ? (
            <Image 
              source={{ uri: previewUri }} 
              contentFit="contain" 
              style={styles.image}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.fallbackContainer}>
              <Text style={styles.fallback}>cannot load preview</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.95)',
    },
    touchArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
    },
    image: {
      width: Dimensions.get('window').width,
      height: Dimensions.get('window').height,
    },
    fallbackContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallback: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.md,
      textAlign: 'center',
    },
  });

