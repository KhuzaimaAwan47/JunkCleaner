import React from "react";
import styled from "styled-components/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PressableProps } from "react-native";

const Button = styled.Pressable`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.lg}px;
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.primary};
  margin-top: ${({ theme }) => theme.spacing.md}px;
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
`;

const Label = styled.Text`
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  margin-left: 10px;
`;

type Props = PressableProps & {
  label?: string;
};

const ScanButton: React.FC<Props> = ({ label = "Clean Now", ...rest }) => (
  <Button {...rest}>
    <MaterialCommunityIcons name="lightning-bolt" size={24} color="#fff" />
    <Label>{label}</Label>
  </Button>
);

export default ScanButton;
