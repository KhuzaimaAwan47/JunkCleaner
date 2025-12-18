import LottieView from "lottie-react-native";
import React from "react";
import { StyleSheet, View } from "react-native";
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
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <LottieView
        ref={lottieRef}
        source={require("../assets/lottie/Scanning_Files.json")}
        style={{ width: size, height: size }}
        autoPlay
        loop
      />
    </View>
  );
};

export default CircularLoadingIndicator;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    wrapper: {
      alignItems: "center",
      justifyContent: "center",
    },
  });

