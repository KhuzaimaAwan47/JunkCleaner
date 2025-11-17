import React from "react";
import styled, { useTheme } from "styled-components/native";
import { Switch } from "react-native";
import NeumorphicContainer from "./NeumorphicContainer";

type Props = {
  title: string;
  caption?: string;
  value: boolean;
  onValueChange?: (value: boolean) => void;
};

const Row = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const TextWrap = styled.View`
  flex: 1;
  margin-right: ${({ theme }) => theme.spacing.md}px;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 600;
`;

const Caption = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
  margin-top: 2px;
`;

const ToggleRow: React.FC<Props> = ({ title, caption, value, onValueChange }) => {
  const theme = useTheme();

  return (
    <NeumorphicContainer padding={18}>
      <Row>
        <TextWrap>
          <Title>{title}</Title>
          {caption ? <Caption>{caption}</Caption> : null}
        </TextWrap>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: `${theme.colors.surfaceAlt}99`, true: theme.colors.primary }}
          thumbColor="#fff"
        />
      </Row>
    </NeumorphicContainer>
  );
};

export default ToggleRow;
