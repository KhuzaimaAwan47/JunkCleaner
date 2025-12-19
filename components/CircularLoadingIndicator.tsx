import LottieView from "lottie-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import type { SmartScanProgress } from "../utils/smartScan";

type Props = {
  scanProgress?: SmartScanProgress | null;
  size?: number;
};

const CircularLoadingIndicator: React.FC<Props> = ({ scanProgress, size = 200 }) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const lottieRef = React.useRef<LottieView>(null);

  // Start/stop animation based on scan progress
  React.useEffect(() => {
    if (scanProgress) {
      lottieRef.current?.play();
    } else {
      lottieRef.current?.pause();
    }
  }, [scanProgress]);

  if (!scanProgress) {
    return null;
  }

  return (
    <>
      <View style={[styles.wrapper, { height: size, minHeight: size }]}>
        <LottieView
          ref={lottieRef}
          source={require("../assets/lottie/Scanning_Files.json")}
          style={styles.lottie}
          autoPlay
          loop
        />
      </View>
      <Text style={styles.scanningText}>
        Scanning... {scanProgress.scannerName}
      </Text>
    </>
  );
};

export default CircularLoadingIndicator;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    wrapper: {
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "stretch",
      marginHorizontal: -theme.spacing.lg,
      flexShrink: 0,
      flexGrow: 0,
    },
    lottie: {
      width: "100%",
      height: "100%",
    },
    scanningText: {
      marginTop: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.textMuted || theme.colors.text,
      textAlign: "center",
      fontWeight: "500",
      alignSelf: "center",
    },
  });

