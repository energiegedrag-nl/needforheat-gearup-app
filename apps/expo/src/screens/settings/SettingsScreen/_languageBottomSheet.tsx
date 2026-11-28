import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, TouchableOpacity } from "@gorhom/bottom-sheet";
import { BottomSheetModalMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { ListItem, Text } from "@rneui/themed";
import * as SecureStore from "expo-secure-store";

import useTranslation, { LanguageCode } from "@/hooks/translation/useTranslation";
import { STORE_LANGUAGE_KEY } from "@/lib/languageDetector";
import { ListItemTouchableOpacity } from "@/lib/listItemTouchables";
import useSheetStyle from "@/hooks/theme/useSheetStyle";

type Props = { bottomSheetRef: React.RefObject<BottomSheetModalMethods | null> };

export default function LanguageBottomSheet({ bottomSheetRef }: Props) {
  const sheetStyle = useSheetStyle();
  const { languages, changeLanguage } = useTranslation();

  async function onChangeLanguagePress(language: LanguageCode) {
    bottomSheetRef.current?.close();
    changeLanguage(language);
    await SecureStore.setItemAsync(STORE_LANGUAGE_KEY, language);
  }

  return (
    <BottomSheetModal
      {...sheetStyle}
      enableDynamicSizing
      ref={bottomSheetRef}
      backdropComponent={props => <BottomSheetBackdrop {...props} pressBehavior="close" disappearsOnIndex={-1} />}
    >
      <BottomSheetScrollView>
        {Object.entries(languages).map(([code, language], index) => (
          <ListItem key={`language-${index}`} onPress={() => onChangeLanguagePress(code)} Component={ListItemTouchableOpacity}>
            <Text>{language}</Text>
          </ListItem>
        ))}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
