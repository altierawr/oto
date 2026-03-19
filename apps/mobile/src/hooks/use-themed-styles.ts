import { Colors } from "@/constants/theme";
import { StyleSheet } from "react-native";
import { useTheme } from "./use-theme";
import { useMemo } from "react";

export type Theme = typeof Colors.light;

const useThemedStyles = <T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T): T => {
  const theme = useTheme();
  return useMemo(() => StyleSheet.create(factory(theme)), [theme, factory]);
};

export default useThemedStyles;
