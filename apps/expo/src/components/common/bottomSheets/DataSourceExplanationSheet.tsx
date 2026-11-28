import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { BottomSheetModalMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Text, makeStyles } from "@rneui/themed";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import useSheetStyle from "@/hooks/theme/useSheetStyle";

type HomeSelectExplanationBottomSheetProps = {
  bottomSheetRef: React.RefObject<BottomSheetModalMethods | null>;
};

export default function DataSourceExplanationSheet({ bottomSheetRef }: HomeSelectExplanationBottomSheetProps) {
  const sheetStyle = useSheetStyle();
  const { t } = useTranslation();
  const style = useStyles();

  return (
    <View style={style.container}>
      <BottomSheetModal
      {...sheetStyle}
        ref={bottomSheetRef}
        snapPoints={["40%", "100%"]}
        enablePanDownToClose
        backdropComponent={props => <BottomSheetBackdrop {...props} pressBehavior="close" disappearsOnIndex={-1} />}
      >
        <BottomSheetView style={style.contentContainer}>
          <Text h4 style={style.title}>
            {t("screens.device_overview.explanation_sheet.title")}
          </Text>
          <Text style={style.body}>
            {t("screens.device_overview.explanation_sheet.description")}
          </Text>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "transparent",
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
  },
  title: {
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  body: {
    lineHeight: 24,
    color: theme.colors.grey1,
  },
}));
