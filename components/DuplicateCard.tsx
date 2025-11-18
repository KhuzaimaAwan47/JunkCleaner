import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DuplicateGroup } from '../../lib/utils/fileScanner';

interface DuplicateCardProps {
  group: DuplicateGroup;
}

const neumorphicStyles = {
  shadowColorLight: 'rgba(255, 255, 255, 0.1)',
  shadowColorDark: 'rgba(0, 0, 0, 0.5)',
  backgroundColor: '#2d2d2d',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getFileName(path: string): string {
  return path.split('/').pop() || path.split('\\').pop() || path;
}

export default function DuplicateCard({ group }: DuplicateCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.countText}>
              {group.files.length} duplicate{group.files.length > 1 ? 's' : ''}
            </Text>
            <Text style={styles.sizeText}>
              {formatBytes(group.totalSize)} total
            </Text>
          </View>
          <Text style={styles.expandIcon}>
            {expanded ? '▼' : '▶'}
          </Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.fileList}>
          {group.files.map((file, index) => (
            <View key={index} style={styles.fileItem}>
              <Text style={styles.fileName} numberOfLines={1}>
                {getFileName(file.path)}
              </Text>
              <Text style={styles.filePath} numberOfLines={1}>
                {file.path}
              </Text>
              <Text style={styles.fileSize}>
                {formatBytes(file.size)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: neumorphicStyles.backgroundColor,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: neumorphicStyles.shadowColorDark,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
    // Neumorphic inset effect
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  countText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sizeText: {
    color: '#aaaaaa',
    fontSize: 14,
  },
  expandIcon: {
    color: '#888888',
    fontSize: 12,
    marginLeft: 16,
  },
  fileList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  fileItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  fileName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  filePath: {
    color: '#888888',
    fontSize: 12,
    marginBottom: 4,
  },
  fileSize: {
    color: '#aaaaaa',
    fontSize: 12,
  },
});

