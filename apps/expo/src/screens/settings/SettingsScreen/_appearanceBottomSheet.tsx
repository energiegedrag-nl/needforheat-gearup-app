import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { BottomSheetModalMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { ListItem, Text, useTheme } from "@rneui/themed";
import Ionicons from "react-native-vector-icons/Ionicons";

import useSheetStyle from "@/hooks/theme/useSheetStyle";
import useTranslation from "@/hooks/translation/useTranslation";
import { ListItemTouchableOpacity } from "@/lib/listItemTouchables";
import { APPEARANCE_PREFERENCES, AppearancePreference, useAppearance } from "@/providers/AppearanceProvider";

type Props = { bottomSheetRef: React.RefObject<BottomSheetModalMethods | null> };

const ICONS: Record<AppearancePreference, string> = {
  system: "phone-portrait-outline",
  light: "sunny-outline",
  dark: "moon-outline",
};

/** Light, dark, or as the phone: the choice is kept on the phone. */
export default function AppearanceBottomSheet({ bottomSheetRef }: Props) {
  const sheetStyle = useSheetStyle();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { preference, setPreference } = useAppearance();

  function onPress(next: AppearancePreference) {
    bottomSheetRef.current?.close();
    setPreference(next);
  }

  return (
    <BottomSheetModal
      {...sheetStyle}
      enableDynamicSizing
      ref={bottomSheetRef}
      backdropComponent={props => <BottomSheetBackdrop {...props} pressBehavior="close" disappearsOnIndex={-1} />}
    >
      <BottomSheetScrollView>
        {APPEARANCE_PREFERENCES.map(option => {
          const selected = option === preference;
          return (
            <ListItem key={option} onPress={() => onPress(option)} Component={ListItemTouchableOpacity}>
              <Ionicons name={ICONS[option]} size={22} color={selected ? theme.colors.tint : theme.colors.grey2} />
              <ListItem.Content>
                <Text bold={selected}>{t(`screens.settings_stack.settings_screen.appearance.${option}`)}</Text>
              </ListItem.Content>
              {selected ? <Ionicons name="checkmark" size={22} color={theme.colors.tint} /> : null}
            </ListItem>
          );
        })}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
