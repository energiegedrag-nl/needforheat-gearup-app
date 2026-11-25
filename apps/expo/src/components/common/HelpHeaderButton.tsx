import { TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

import useTranslation from "@/hooks/translation/useTranslation";
import { BRAND } from "@/lib/theme";

/**
 * The question mark of the home screen, small, in the header: opens the explanation of the current step.
 * In the header it covers nothing of the screen itself.
 */
export default function HelpHeaderButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("common.explanation") as string}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      testID="help-header-button"
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: BRAND.navy,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Icon name="help" size={24} color="white" />
      </View>
    </TouchableOpacity>
  );
}
