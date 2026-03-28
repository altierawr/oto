import useThemedStyles, { Theme } from "@/hooks/use-themed-styles";
import { StyleSheet, Text, View } from "react-native";

const LoginPage = () => {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <Text>Log in</Text>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default LoginPage;
