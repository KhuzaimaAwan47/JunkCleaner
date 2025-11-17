import React, { useState } from "react";
import styled, { DefaultTheme } from "styled-components/native";
import AppHeader from "../../components/AppHeader";
import ToggleRow from "../../components/ToggleRow";

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.background};
`;

const Screen = styled.ScrollView`
  flex: 1;
  padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
`;

const NotificationReminderScreen = () => {
  const [daily, setDaily] = useState(true);
  const [smart, setSmart] = useState(false);
  const [whatsapp, setWhatsapp] = useState(true);

  return (
    <Container>
      <Screen showsVerticalScrollIndicator={false}>
        <AppHeader title="Reminders" subtitle="stay in sync" />
        <ToggleRow
          title="Daily digest"
          caption="Summary at 09:00"
          value={daily}
          onValueChange={setDaily}
        />
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
      </Screen>
    </Container>
  );
};

export default NotificationReminderScreen;
