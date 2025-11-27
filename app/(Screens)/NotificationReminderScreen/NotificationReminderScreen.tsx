import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import ToggleRow from "../../../components/ToggleRow";

const NotificationReminderScreen = () => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [daily, setDaily] = React.useState(true);
  const [smart, setSmart] = React.useState(false);
  const [whatsapp, setWhatsapp] = React.useState(true);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader title="Reminders" subtitle="stay in sync" />
        <View style={styles.section}>
          <ToggleRow title="Daily digest" caption="Summary at 09:00" value={daily} onValueChange={setDaily} />
          <ToggleRow
            title="Smart clean alerts"
            caption="Trigger when junk > 2 GB"
            value={smart}
            onValueChange={setSmart}
          />
          <ToggleRow
            title="WhatsApp cleanup"
            caption="Weekend media sweep"
            value={whatsapp}
            onValueChange={setWhatsapp}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationReminderScreen;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    section: {
      gap: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.xl,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
    },
  });
