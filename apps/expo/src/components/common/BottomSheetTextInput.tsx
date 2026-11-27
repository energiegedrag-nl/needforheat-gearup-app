import { BottomSheetTextInput as SheetTextInput } from "@gorhom/bottom-sheet";
import { InputProps as InputPropsBase } from "@rneui/base";
import { Input, InputProps } from "@rneui/themed";
import { forwardRef } from "react";

// An RNEUI Input whose text field is the bottom sheet's own, so the sheet moves up with the keyboard
// (the sheet tracks its keyboard state itself since @gorhom/bottom-sheet 5).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BottomSheetTextInput = forwardRef<InputProps, InputPropsBase & { component?: React.ComponentType<any> }>(
  ({ component, ...restProps }, ref) => {
    const Component = component || Input;
    return <Component ref={ref} InputComponent={SheetTextInput} {...restProps} />;
  }
);
