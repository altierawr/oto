import useThemedStyles, { Theme } from "@/hooks/use-themed-styles";
import { StyleSheet, Text, View } from "react-native";

const HomePage = () => {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to oto</Text>
    </View>
  );
};

export default HomePage;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    text: {
      color: theme.blue11,
    },
  });
