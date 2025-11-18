import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import styled, { DefaultTheme, useTheme } from 'styled-components/native';
import { DuplicateGroup } from '../utils/fileScanner';
import NeumorphicContainer from './NeumorphicContainer';

interface DuplicateCardProps {
  group: DuplicateGroup;
}

type WithTheme = { theme: DefaultTheme };

const CardWrapper = styled.View<WithTheme>`
  margin-vertical: ${({ theme }: WithTheme) => theme.spacing.xs}px;
  margin-horizontal: ${({ theme }: WithTheme) => theme.spacing.xs}px;
`;

const Header = styled.Pressable`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const HeaderContent = styled.View`
  flex: 1;
`;

const CountText = styled.Text<WithTheme>`
  color: ${({ theme }: WithTheme) => theme.colors.text};
  font-size: 16px;
  font-weight: 700;
  margin-bottom: ${({ theme }: WithTheme) => theme.spacing.xs / 2}px;
`;

const SizeText = styled.Text<WithTheme>`
  color: ${({ theme }: WithTheme) => theme.colors.textMuted};
  font-size: 14px;
  font-weight: 500;
`;

const ExpandIcon = styled(MaterialCommunityIcons)<WithTheme>`
  color: ${({ theme }: WithTheme) => theme.colors.textMuted};
  margin-left: ${({ theme }: WithTheme) => theme.spacing.md}px;
`;

const FileList = styled.View<WithTheme>`
  margin-top: ${({ theme }: WithTheme) => theme.spacing.md}px;
  padding-top: ${({ theme }: WithTheme) => theme.spacing.md}px;
  border-top-width: 1px;
  border-top-color: ${({ theme }: WithTheme) => `${theme.colors.surfaceAlt}66`};
`;

const FileItem = styled.View<WithTheme>`
  padding-vertical: ${({ theme }: WithTheme) => theme.spacing.sm}px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }: WithTheme) => `${theme.colors.surfaceAlt}33`};
`;

const FileName = styled.Text<WithTheme>`
  color: ${({ theme }: WithTheme) => theme.colors.text};
  font-size: 14px;
  font-weight: 600;
  margin-bottom: ${({ theme }: WithTheme) => theme.spacing.xs / 2}px;
`;

const FilePath = styled.Text<WithTheme>`
  color: ${({ theme }: WithTheme) => theme.colors.textMuted};
  font-size: 12px;
  margin-bottom: ${({ theme }: WithTheme) => theme.spacing.xs / 2}px;
`;

const FileSize = styled.Text<WithTheme>`
  color: ${({ theme }: WithTheme) => theme.colors.textMuted};
  font-size: 12px;
  font-weight: 500;
`;

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
  const theme = useTheme();

  return (
    <CardWrapper>
      <NeumorphicContainer padding={theme.spacing.md}>
        <Header onPress={() => setExpanded(!expanded)}>
          <HeaderContent>
            <CountText>
              {group.files.length} duplicate{group.files.length > 1 ? 's' : ''}
            </CountText>
            <SizeText>{formatBytes(group.totalSize)} total</SizeText>
          </HeaderContent>
          <ExpandIcon
            name={expanded ? 'chevron-down' : 'chevron-right'}
            size={24}
          />
        </Header>

        {expanded && (
          <FileList>
            {group.files.map((file, index) => (
              <FileItem key={index}>
                <FileName numberOfLines={1}>{getFileName(file.path)}</FileName>
                <FilePath numberOfLines={1}>{file.path}</FilePath>
                <FileSize>{formatBytes(file.size)}</FileSize>
              </FileItem>
            ))}
          </FileList>
        )}
      </NeumorphicContainer>
    </CardWrapper>
  );
}

