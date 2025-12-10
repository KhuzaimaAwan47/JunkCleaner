import React, { forwardRef, useCallback, useEffect, useRef } from "react";
import {
    GestureResponderEvent,
    TouchableOpacity as RNTouchableOpacity,
    TouchableOpacityProps,
} from "react-native";

type TouchableOpacityHandle = React.ElementRef<typeof RNTouchableOpacity>;

type Props = TouchableOpacityProps & {
  debounceDelay?: number;
};

/**
 * TouchableOpacity wrapper that blocks rapid repeat presses.
 */
const DebouncedTouchableOpacity = forwardRef<TouchableOpacityHandle, Props>(
  ({ debounceDelay = 300, onPress, disabled, ...rest }, ref) => {
    const isCoolingDown = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }, []);

    const handlePress = useCallback(
      (event: GestureResponderEvent) => {
        if (disabled || isCoolingDown.current) {
          return;
        }

        if (onPress) {
          onPress(event);
        }

        if (debounceDelay > 0) {
          isCoolingDown.current = true;
          timerRef.current = setTimeout(() => {
            isCoolingDown.current = false;
          }, debounceDelay);
        }
      },
      [debounceDelay, disabled, onPress],
    );

    return (
      <RNTouchableOpacity
        ref={ref}
        onPress={handlePress}
        disabled={disabled}
        {...rest}
      />
    );
  },
);

DebouncedTouchableOpacity.displayName = "DebouncedTouchableOpacity";

export default DebouncedTouchableOpacity;

