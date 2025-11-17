import React from "react";
import styled from "styled-components/native";
import NeumorphicContainer from "./NeumorphicContainer";

type Props = {
  label: string;
  value: string;
  accent?: string;
};

const Label = styled.Text`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Value = styled.Text<{ accent?: string }>`
  margin-top: 6px;
  font-size: 22px;
  font-weight: 700;
  color: ${({ accent, theme }) => accent ?? theme.colors.text};
`;

const ResultStatCard: React.FC<Props> = ({ label, value, accent }) => (
  <NeumorphicContainer padding={18} glass>
    <Label>{label}</Label>
    <Value accent={accent}>{value}</Value>
  </NeumorphicContainer>
);

export default ResultStatCard;
