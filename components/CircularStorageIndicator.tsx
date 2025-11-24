import React from "react";
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from "react-native-svg";
import styledNative, { useTheme } from "styled-components/native";

type Props = {
  total: number;
  used: number;
  size?: number;
  label?: string;
};

const Wrapper = styledNative.View<{ size: number }>`
  width: ${({ size }) => size}px;
  height: ${({ size }) => size}px;
  align-items: center;
  justify-content: center;
`;

const Inner = styledNative.View`
  position: absolute;
  align-items: center;
  justify-content: center;
`;

const Value = styledNative.Text`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

const Caption = styledNative.Text`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const CircularStorageIndicator: React.FC<Props> = ({ total, used, size = 200, label = "Used" }) => {
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, used / total);
  const remaining = total - used;
  const theme = useTheme();
  const gradientId = React.useMemo(() => `usageGradient-${Math.random().toString(36).slice(2, 9)}`, []);
  const trackColor = `${theme.colors.surfaceAlt}55`;

  return (
    <Wrapper size={size}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={theme.colors.primary} stopOpacity={0.95} />
            <Stop offset="100%" stopColor={theme.colors.secondary} stopOpacity={0.9} />
          </SvgGradient>
        </Defs>
        <Circle
          stroke={trackColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={`url(#${gradientId})`}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference - progress * circumference}
          strokeLinecap="round"
        />
      </Svg>
      <Inner style={{ width: size - 80, height: size - 80 }}>
        <Value>{used} GB</Value>
        <Caption>{label}</Caption>
        <Caption>{remaining.toFixed(1)} GB free</Caption>
      </Inner>
    </Wrapper>
  );
};

export default CircularStorageIndicator;
