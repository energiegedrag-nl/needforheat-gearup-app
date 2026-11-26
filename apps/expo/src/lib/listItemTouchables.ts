import type { Component } from "react";
import { TouchableHighlight, TouchableOpacity } from "react-native";

// RNEUI types the Component prop of ListItem as a class component; since React Native 0.81 the
// touchables are forwardRef components. Same behaviour at runtime, only the types differ.
export const ListItemTouchableOpacity = TouchableOpacity as unknown as typeof Component;
export const ListItemTouchableHighlight = TouchableHighlight as unknown as typeof Component;
