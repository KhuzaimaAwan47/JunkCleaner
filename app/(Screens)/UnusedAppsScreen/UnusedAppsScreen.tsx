import React, { useCallback, useEffect, useMemo } from "react";
import { SectionList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import EmptyState from "../../../components/EmptyState";
import FixedUninstallButton from "../../../components/FixedUninstallButton";
import LoadingOverlay from "../../../components/LoadingOverlay";
import ScreenWrapper from "../../../components/ScreenWrapper";
import UnusedAppListItem from "../../../components/UnusedAppListItem";
import UnusedAppSectionHeader from "../../../components/UnusedAppSectionHeader";
import { setSelectedItems } from "../../../redux-code/action";
import type { RootState } from "../../../redux-code/store";
import type { UnusedAppInfo } from "./UnusedAppsScanner";
import { useUnusedAppsActions } from "./useUnusedAppsActions";
import { useUnusedAppsGrouping, type SectionData } from "./useUnusedAppsGrouping";
import { useUnusedAppsSelection } from "./useUnusedAppsSelection";

const UnusedAppsScreen = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const apps = useSelector((state: RootState) => state.appState.unusedAppsResults);
  const loading = useSelector((state: RootState) => state.appState.loadingStates.unused);
  const selectedPackageNamesArray = useSelector((state: RootState) => state.appState.selectedItems.unused);
  const selectedPackageNames = useMemo(() => new Set(selectedPackageNamesArray), [selectedPackageNamesArray]);
  
  const { handleScan, handleUninstall, uninstalling } = useUnusedAppsActions(apps, selectedPackageNames);
  const { selectedStats, isAllSelected, toggleAppSelection, toggleSelectAll } = useUnusedAppsSelection(apps, selectedPackageNames);
  const groupedData = useUnusedAppsGrouping(apps);

  useEffect(() => {
    const availablePackageNames = new Set(apps.map((app) => app.packageName));
    const validSelections = selectedPackageNamesArray.filter((packageName) => availablePackageNames.has(packageName));
    if (validSelections.length !== selectedPackageNamesArray.length) {
      dispatch(setSelectedItems("unused", validSelections));
    }
  }, [apps, selectedPackageNamesArray, dispatch]);

  const renderItem = useCallback(
    ({ item }: { item: UnusedAppInfo }) => (
      <UnusedAppListItem
        item={item}
        selected={selectedPackageNames.has(item.packageName)}
        onPress={() => toggleAppSelection(item.packageName)}
      />
    ),
    [selectedPackageNames, toggleAppSelection]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionData }) => (
      <UnusedAppSectionHeader title={section.title} count={section.data.length} />
    ),
    []
  );

  const keyExtractor = useCallback((item: UnusedAppInfo) => item.packageName, []);

  const listContentInset = useMemo(
    () => ({
      paddingTop: theme.spacing.md,
      paddingBottom: selectedStats.items > 0 && apps.length > 0 ? theme.spacing.xl * 3 : theme.spacing.xl,
    }),
    [theme.spacing.xl, theme.spacing.md, selectedStats.items, apps.length],
  );

  const unusedCount = apps.filter((a) => a.category === "UNUSED").length;
  const uninstallDisabled = selectedStats.items === 0;
  const hasApps = apps.length > 0;

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <View style={styles.content}>
          <AppHeader
            title="Unused Apps"
            totalFiles={hasApps ? apps.length : undefined}
            unusedCount={hasApps ? unusedCount : undefined}
            isAllSelected={hasApps ? isAllSelected : undefined}
            onSelectAllPress={hasApps ? toggleSelectAll : undefined}
            selectAllDisabled={hasApps ? !apps.length : undefined}
          />

         

          {!loading && hasApps ? (
            <SectionList
              sections={groupedData}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={listContentInset}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>no unused apps detected</Text>
                </View>
              }
              ListFooterComponent={<View style={styles.footerSpacer} />}
            />
          ) : !loading ? (
            <EmptyState
              icon="package-variant-closed"
              title="No unused apps found"
              description="We could not find unused applications on your device."
              actionLabel="Rescan"
              onAction={handleScan}
            />
          ) : null}
        </View>
        <FixedUninstallButton
          items={selectedStats.items}
          disabled={uninstallDisabled}
          loading={uninstalling}
          onPress={() => handleUninstall(selectedStats)}
          visible={!uninstallDisabled && hasApps}
        />
      </SafeAreaView>
    <LoadingOverlay visible={loading} label="Scanning Uused Apps ..." />
    </ScreenWrapper>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      gap: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
    },
    progressCard: {
      marginTop: theme.spacing.md,
    },
    footerSpacer: {
      height: theme.spacing.xl,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xl * 2,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      textAlign: "center",
      paddingHorizontal: theme.spacing.lg,
    },
  });

export default UnusedAppsScreen;
