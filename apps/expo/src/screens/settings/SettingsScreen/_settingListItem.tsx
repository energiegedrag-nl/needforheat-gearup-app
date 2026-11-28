import { ListItem, makeStyles, Text } from "@rneui/themed";

import Box from "../../../components/elements/Box";
import { ListItemTouchableOpacity } from "@/lib/listItemTouchables";

export type SettingItem = {
  title: string;
  value: string;
  onPress: () => void;
  isDangerous?: boolean;
};

type SettingItemProps = {
  item: SettingItem;
};

export default function SettingListItem({ item }: SettingItemProps) {
  const styles = useStyles(item);

  return (
    <ListItem
      Component={ListItemTouchableOpacity}
      onPress={item.onPress}
      style={styles.item}
      containerStyle={styles.card}
    >
      <ListItem.Content>
        <Box fullWidth style={styles.content}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.value}>{item.value}</Text>
        </Box>
      </ListItem.Content>
    </ListItem>
  );
}

const useStyles = makeStyles((theme, props: SettingItem) => ({
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginVertical: 5,
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    flexShrink: 1,
    marginRight: theme.spacing.md,
    color: props.isDangerous ? theme.colors.error : theme.colors.black,
  },
  value: {
    color: theme.colors.grey2,
  },
}));
