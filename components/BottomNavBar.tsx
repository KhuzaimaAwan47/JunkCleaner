import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import React from "react";
import styledNative, { useTheme } from "styled-components/native";
import { appRoutes } from "../routes";

const Container = styledNative.View`
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md}px;
  border-top-width: 1px;
  border-top-color: ${({ theme }) => `${theme.colors.surfaceAlt}55`};
  background-color: ${({ theme }) => theme.colors.surface};
`;

const NavButton = styledNative.Pressable<{ active: boolean }>`
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 16px;
  background-color: ${({ active, theme }) => (active ? `${theme.colors.primary}12` : "transparent")};
`;

const Label = styledNative.Text<{ active: boolean }>`
  margin-top: 4px;
  font-size: 12px;
  color: ${({ active, theme }) => (active ? theme.colors.primary : theme.colors.textMuted)};
`;

const items = [
  { label: "Home", icon: "home-variant", href: appRoutes.home },
  { label: "Scanner", icon: "radar", href: appRoutes.junkScanner },
  { label: "Storage", icon: "chart-pie", href: appRoutes.storageDashboard },
  { label: "Smart", icon: "lightning-bolt", href: appRoutes.smartClean },
];

const BottomNavBar: React.FC = () => {
  const pathname = usePathname();
  const theme = useTheme();

  return (
    <Container>
      {items.map((item) => {
        const screenName = item.href.split("/").pop() ?? "";
        const active = pathname?.endsWith(screenName);
        return (
          <NavButton key={item.href} active={!!active} onPress={() => router.push(item.href)}>
            <MaterialCommunityIcons
              name={item.icon as any}
              size={22}
              color={active ? theme.colors.primary : theme.colors.textMuted}
            />
            <Label active={!!active}>{item.label}</Label>
          </NavButton>
        );
      })}
    </Container>
  );
};

export default BottomNavBar;
