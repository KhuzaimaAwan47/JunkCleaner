import React from "react";
import styled from "styled-components/native";
import NeumorphicContainer from "./NeumorphicContainer";

const Caption = styled.Text`
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
`;

const Title = styled.Text`
  text-align: center;
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
`;

const AdPlaceholder: React.FC = () => (
  <NeumorphicContainer glass padding={18}>
    <Title>Ad placeholder</Title>
    <Caption>Your sponsored message fits perfectly here.</Caption>
  </NeumorphicContainer>
);

export default AdPlaceholder;
