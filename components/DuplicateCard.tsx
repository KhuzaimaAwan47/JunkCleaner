import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image } from 'react-native';
import styledNative, { DefaultTheme, useTheme } from 'styled-components/native';
import NeumorphicContainer from './NeumorphicContainer';

const styled = styledNative;

export interface DuplicateFileItem {
  id: string;
  path: string;
  size: number;
  modifiedDate: number;
  groupHash: string;
}

interface DuplicateCardProps {
  file: DuplicateFileItem;
  isSelected: boolean;
  onToggleSelect: () => void;
}

const CardWrapper = styled.View<{ theme: DefaultTheme }>`
  margin-vertical: ${({ theme }) => theme.spacing.xs}px;
`;

const CardInner = styled.View<{ theme: DefaultTheme }>`
  width: 100%;
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
`;

const ThumbnailWrapper = styled.View<{ theme: DefaultTheme }>`
  width: 56px;
  height: 56px;
  border-radius: 18px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => `${theme.colors.surfaceAlt}cc`};
`;

const ThumbnailImage = styled(Image)`
  width: 100%;
  height: 100%;
`;

const IconBubble = styled.View<{ theme: DefaultTheme }>`
  width: 56px;
  height: 56px;
  border-radius: 18px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => `${theme.colors.primary}18`};
`;

const InfoColumn = styled.View<{ theme: DefaultTheme }>`
  flex: 1;
  gap: ${({ theme }) => theme.spacing.xs / 2}px;
`;

const Title = styled.Text<{ theme: DefaultTheme }>`
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 700;
`;

const MetaRow = styled.View<{ theme: DefaultTheme }>`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs}px;
`;

const MetaText = styled.Text<{ theme: DefaultTheme }>`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
`;

const PathText = styled.Text<{ theme: DefaultTheme }>`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
`;

const SelectButton = styled.Pressable<{ theme: DefaultTheme }>`
  width: 32px;
  align-items: center;
  justify-content: center;
`;

const SelectIndicator = styled.View<{ selected: boolean; theme: DefaultTheme }>`
  width: 26px;
  height: 26px;
  border-radius: 13px;
  border-width: 2px;
  border-color: ${({ selected, theme }) =>
    selected ? theme.colors.primary : `${theme.colors.primary}66`};
  background-color: ${({ selected, theme }) =>
    selected ? theme.colors.primary : theme.colors.surface};
  align-items: center;
  justify-content: center;
  shadow-color: ${({ selected, theme }) =>
    selected ? 'rgba(0, 0, 0, 0.15)' : `${theme.colors.primary}aa`};
  shadow-opacity: ${({ selected }) => (selected ? 0.2 : 0.45)};
  shadow-radius: ${({ selected }) => (selected ? 6 : 10)}px;
  elevation: ${({ selected }) => (selected ? 4 : 8)};
`;

const SelectIndicatorInner = styled.View<{ selected: boolean; theme: DefaultTheme }>`
  width: ${({ selected }) => (selected ? 12 : 6)}px;
  height: ${({ selected }) => (selected ? 12 : 6)}px;
  border-radius: 12px;
  background-color: ${({ selected, theme }) =>
    selected ? '#ffffff' : `${theme.colors.surfaceAlt}aa`};
`;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function getFileName(path: string): string {
  return path.split('/').pop() || path.split('\\').pop() || path;
}

function formatDateLabel(timestamp?: number): string {
  if (!timestamp) return 'unknown date';
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}

function getLocationLabel(path: string): string {
  const normalized = path.toLowerCase();
  if (normalized.includes('sdcard')) return 'sdcard';
  if (normalized.includes('download')) return 'downloads';
  if (normalized.includes('whatsapp')) return 'whatsapp';
  if (normalized.includes('dcim') || normalized.includes('camera')) return 'camera roll';
  if (normalized.includes('android')) return 'android';
  return 'local storage';
}

function ensureFileUri(path: string): string | null {
  if (!path) {
    return null;
  }
  if (path.startsWith('file://') || path.startsWith('content://') || path.startsWith('data:')) {
    return path;
  }
  return `file://${path}`;
}

export default function DuplicateCard({ file, isSelected, onToggleSelect }: DuplicateCardProps) {
  const theme = useTheme();
  const [loadError, setLoadError] = React.useState(false);
  const imageUri = React.useMemo(() => ensureFileUri(file.path), [file.path]);
  const showImage = !!imageUri && !loadError;

  return (
    <CardWrapper>
      <NeumorphicContainer padding={theme.spacing.md}>
        <CardInner>
          {showImage ? (
            <ThumbnailWrapper>
              <ThumbnailImage
                source={{ uri: imageUri }}
                resizeMode="cover"
                onError={() => setLoadError(true)}
              />
            </ThumbnailWrapper>
          ) : (
            <IconBubble>
              <MaterialCommunityIcons
                name="file-document-outline"
                size={28}
                color={theme.colors.primary}
              />
            </IconBubble>
          )}

          <InfoColumn>
            <Title numberOfLines={1}>{getFileName(file.path)}</Title>
            <MetaRow>
              <MetaText>{formatBytes(file.size)}</MetaText>
              <MetaText>•</MetaText>
              <MetaText>{formatDateLabel(file.modifiedDate)}</MetaText>
            </MetaRow>
            
          </InfoColumn>

          <SelectButton
            onPress={onToggleSelect}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
          >
            <SelectIndicator selected={isSelected}>
              {isSelected ? (
                <MaterialCommunityIcons name="check" size={16} color="#ffffff" />
              ) : (
                <SelectIndicatorInner selected={isSelected} />
              )}
            </SelectIndicator>
          </SelectButton>
        </CardInner>
      </NeumorphicContainer>
    </CardWrapper>
  );
}

