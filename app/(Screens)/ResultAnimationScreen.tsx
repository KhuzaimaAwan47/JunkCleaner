import React from "react";
import { MotiView } from "moti";
import ResultStatCard from "../../components/ResultStatCard";
import ScanButton from "../../components/ScanButton";
import { router } from "expo-router";
import { appRoutes } from "../../routes";
import { resultAnimationStyles } from "../../styles/screens";

const { Screen, AnimationShell, Label } = resultAnimationStyles;

const ResultAnimationScreen = () => (
  <Screen>
    <MotiView
      from={{ scale: 0.8, opacity: 0.4 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ loop: true, type: 'timing', duration: 1200 }}
    >
      <AnimationShell>
        <MotiView
          from={{ scale: 0.6, opacity: 0.3 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ loop: true, delay: 200, type: 'timing', duration: 1500 }}
          style={{ width: 160, height: 160, borderRadius: 80, backgroundColor: '#6C63FF22' }}
        />
      </AnimationShell>
    </MotiView>
    <ResultStatCard label="Space cleaned" value="856 MB" accent="#6C63FF" />
    <Label>visual placeholder for lottie animation</Label>
    <ScanButton label="Done" onPress={() => router.replace(appRoutes.home)} />
  </Screen>
);

export default ResultAnimationScreen;
