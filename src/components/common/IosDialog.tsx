import React from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { triggerHaptic } from "../../utils/haptics";

export interface IosDialogAction {
  text: string;
  onPress?: () => void | Promise<void>;
  style?: "default" | "cancel" | "destructive";
  bold?: boolean;
  loading?: boolean;
}

export interface IosDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  children?: React.ReactNode;
  actions?: IosDialogAction[];
  onClose?: () => void;
}

/**
 * Pixel-perfect, reusable iOS Alert Dialog modal matching Mark-X design language.
 */
export function IosDialog({
  visible,
  title,
  message,
  children,
  actions = [{ text: "OK", style: "default", bold: true }],
  onClose,
}: IosDialogProps) {
  const handleActionPress = async (action: IosDialogAction) => {
    triggerHaptic();
    if (action.onPress) {
      await action.onPress();
    } else if (onClose) {
      onClose();
    }
  };

  const getTextColor = (style?: "default" | "cancel" | "destructive") =>
    style === "destructive" ? "#FF3B30" : "#007AFF";

  const getFontFamily = (action: IosDialogAction) =>
    action.style === "cancel" && !action.bold
      ? "Outfit_400Regular"
      : "Outfit_600SemiBold";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/40 items-center justify-center px-8">
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View className="w-[272px] bg-[#F2F2F2] rounded-[14px] overflow-hidden shadow-2xl">
              {/* Content Area */}
              <View className="pt-5 px-4 pb-4 items-center">
                <Text
                  className="text-[17px] text-[#000000] text-center mb-1.5"
                  style={{ fontFamily: "Outfit_600SemiBold" }}
                >
                  {title}
                </Text>
                {message ? (
                  <Text
                    className="text-[13px] text-[#3C3C43] text-center leading-5"
                    style={{ fontFamily: "Outfit_400Regular" }}
                  >
                    {message}
                  </Text>
                ) : null}
                {children}
              </View>

              {/* Hairline Divider */}
              <View className="h-[0.5px] bg-[#3C3C43]/20" />

              {/* Actions Area */}
              <View className={actions.length === 2 ? "flex-row h-[44px]" : ""}>
                {actions.map((action, idx) => (
                  <React.Fragment key={action.text}>
                    {idx > 0 && (
                      <View
                        className={
                          actions.length === 2
                            ? "w-[0.5px] bg-[#3C3C43]/20"
                            : "h-[0.5px] bg-[#3C3C43]/20"
                        }
                      />
                    )}
                    <TouchableOpacity
                      onPress={() => handleActionPress(action)}
                      activeOpacity={0.7}
                      disabled={action.loading}
                      className={`h-[44px] items-center justify-center active:bg-black/5 ${
                        actions.length === 2 ? "flex-1" : ""
                      }`}
                    >
                      {action.loading ? (
                        <ActivityIndicator
                          size="small"
                          color={getTextColor(action.style)}
                        />
                      ) : (
                        <Text
                          className="text-[17px]"
                          style={{
                            color: getTextColor(action.style),
                            fontFamily: getFontFamily(action),
                          }}
                        >
                          {action.text}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
