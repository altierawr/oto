import { StyleSheet, Text, View } from "react-native";

const SettingsPage = () => {
  return (
    <View style={styles.container}>
      <Text>Settings page</Text>
    </View>
  );
};

export default SettingsPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
