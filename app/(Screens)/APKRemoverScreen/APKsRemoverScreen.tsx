import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import NeumorphicContainer from "../../../components/NeumorphicContainer";
import formatBytes from "../../../constants/formatBytes";
import { ApkFile, deleteApkFile, scanForAPKs } from "./APKScanner";

const APKsRemoverScreen = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [apkFiles, setApkFiles] = useState<ApkFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [hasScanned, setHasScanned] = useState(false);

  const scan = useCallback(async () => {
    setLoading(true);
    setApkFiles([]);
    try {
      const result = await scanForAPKs();
      setApkFiles(result);
      setHasScanned(true);
    } catch (error) {
      console.warn("APK scan failed", error);
      Alert.alert("Scan Failed", "Unable to scan for APK files. Please try again.");
      setHasScanned(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const totalSize = useMemo(() => apkFiles.reduce((sum, item) => sum + (item.size || 0), 0), [apkFiles]);

  const handleDelete = useCallback(
    async (file: ApkFile) => {
      Alert.alert(
        "Delete APK?",
        `This will permanently delete ${file.name} (${formatBytes(file.size)}).`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              setDeleting((prev) => new Set(prev).add(file.path));
              try {
                await deleteApkFile(file.path);
                setApkFiles((prev) => prev.filter((item) => item.path !== file.path));
              } catch (error) {
                console.warn("Delete failed", error);
                Alert.alert("Delete Failed", "Unable to delete the file.");
              } finally {
                setDeleting((prev) => {
                  const next = new Set(prev);
                  next.delete(file.path);
                  return next;
                });
              }
            },
          },
        ]
      );
    },
    []
  );

  const renderItem = useCallback(
    (item: ApkFile) => {
      const isDeleting = deleting.has(item.path);
      return (
        <View key={item.path} style={styles.itemWrapper}>
          <NeumorphicContainer padding={theme.spacing.md}>
            <View style={styles.itemInner}>
              <View style={styles.iconBubble}>
                <MaterialCommunityIcons
                  name="package-variant"
                  size={28}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.infoColumn}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{formatBytes(item.size)}</Text>
                </View>
                <Text style={styles.path} numberOfLines={1}>
                  {item.path}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(item)}
                disabled={isDeleting}
                style={[
                  styles.deleteButton,
                  isDeleting && styles.deleteButtonDisabled,
                ]}
                activeOpacity={0.7}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={theme.colors.background} />
                ) : (
                  <MaterialCommunityIcons name="delete" size={20} color={theme.colors.background} />
                )}
              </TouchableOpacity>
            </View>
          </NeumorphicContainer>
        </View>
      );
    },
    [styles, theme, deleting, handleDelete]
  );

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader title="APK Remover" subtitle="Scan and remove APK installer files" />

        {!loading && apkFiles.length === 0 && (
          <View style={[styles.primaryButtonContainer, styles.sectionSpacing]}>
            <TouchableOpacity style={styles.primaryButton} onPress={scan} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>start scan</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <View style={[styles.progressCard, styles.sectionSpacing]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.progressText}>Scanning...</Text>
          </View>
        )}

        {!loading && apkFiles.length > 0 && (
          <>
            <View style={[styles.metricsRow, styles.sectionSpacing]}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>files found</Text>
                <Text style={styles.metricValue}>{apkFiles.length}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>total size</Text>
                <Text style={styles.metricValue}>{formatBytes(totalSize)}</Text>
              </View>
            </View>

            <View style={[styles.resultsContainer, styles.sectionSpacing]}>
              {apkFiles.map((file) => renderItem(file))}
            </View>

            <View style={[styles.rescanContainer, styles.sectionSpacing]}>
              <TouchableOpacity style={styles.rescanButton} onPress={scan} activeOpacity={0.8}>
                <Text style={styles.rescanButtonText}>rescan</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {!loading && hasScanned && apkFiles.length === 0 && (
          <View style={[styles.emptyCard, styles.sectionSpacing]}>
            <Text style={styles.emptyTitle}>no APK files found</Text>
            <Text style={styles.emptySubtitle}>
              No APK installer files were found on your device.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xl * 1.5,
    },
    sectionSpacing: {
      marginBottom: theme.spacing.lg,
    },
    primaryButtonContainer: {
      marginTop: theme.spacing.md,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radii.xl,
      paddingVertical: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "rgba(0,0,0,0.2)",
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    primaryButtonText: {
      color: "#fff",
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    progressCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}44`,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
    },
    progressText: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      marginTop: theme.spacing.xs,
    },
    metricsRow: {
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    metricCard: {
      flex: 1,
      padding: theme.spacing.md,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
    },
    metricLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.xs,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    metricValue: {
      color: theme.colors.text,
      fontSize: 22,
      fontWeight: "700",
      marginTop: theme.spacing.xs / 2,
    },
    resultsContainer: {
      gap: theme.spacing.xs,
    },
    itemWrapper: {
      marginVertical: 0,
    },
    itemInner: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    iconBubble: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.colors.primary}18`,
    },
    infoColumn: {
      flex: 1,
      gap: theme.spacing.xs / 2,
    },
    fileName: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
    },
    path: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.xs,
    },
    deleteButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    deleteButtonDisabled: {
      opacity: 0.6,
    },
    rescanContainer: {
      marginTop: theme.spacing.md,
    },
    rescanButton: {
      alignSelf: "flex-start",
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    rescanButtonText: {
      color: theme.colors.primary,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      textTransform: "uppercase",
    },
    emptyCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.xl,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}44`,
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    emptyTitle: {
      color: theme.colors.text,
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      textTransform: "capitalize",
    },
    emptySubtitle: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
      textAlign: "center",
    },
  });

export default APKsRemoverScreen;
