import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { triggerHaptic } from "../../utils/haptics";

export interface DriveCreateFolderDialogProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (folderName: string) => void;
  defaultName?: string;
}

export function DriveCreateFolderDialog({
  visible,
  onClose,
  onCreate,
  defaultName = "Untitled folder",
}: DriveCreateFolderDialogProps) {
  const [folderName, setFolderName] = useState(defaultName);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      } catch {}
      setKeyboardHeight(e.endCoordinates.height);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      } catch {}
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setFolderName(defaultName);
      setKeyboardHeight(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
      return () => clearTimeout(timer);
    } else {
      Keyboard.dismiss();
      setKeyboardHeight(0);
    }
  }, [visible, defaultName]);

  const handleCreate = () => {
    triggerHaptic();
    const finalName = folderName.trim() || defaultName;
    Keyboard.dismiss();
    onClose();
    onCreate(finalName);
  };

  const handleCancel = () => {
    triggerHaptic();
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <View style={styles.modalRoot}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleCancel}
        />

        <View
          pointerEvents="box-none"
          style={[
            styles.centerContainer,
            {
              paddingBottom: keyboardHeight > 0 ? Math.round(keyboardHeight * 0.72) : 0,
            },
          ]}
        >
          <View style={styles.card}>
            <View style={styles.content}>
              <Text style={styles.title}>New Folder</Text>
              <Text style={styles.subtitle}>Enter a name for this folder.</Text>

              <View style={styles.inputContainer}>
                <TextInput
                  ref={inputRef}
                  value={folderName}
                  onChangeText={setFolderName}
                  placeholder="Folder name"
                  placeholderTextColor="#8E8E93"
                  selectTextOnFocus
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleCreate}
                  style={styles.textInput}
                />
                {folderName.length > 0 && (
                  <TouchableOpacity
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => {
                      triggerHaptic();
                      setFolderName("");
                    }}
                    style={styles.clearBtn}
                  >
                    <Ionicons name="close-circle" size={16} color="#8E8E93" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.horizontalDivider} />

            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={handleCancel}
                activeOpacity={0.65}
                style={styles.actionBtn}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <View style={styles.verticalDivider} />

              <TouchableOpacity
                onPress={handleCreate}
                activeOpacity={0.65}
                style={styles.actionBtn}
              >
                <Text style={styles.createText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: 276,
    backgroundColor: "#F2F2F2",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  content: {
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 14,
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontFamily: "Outfit_600SemiBold",
    color: "#000000",
    textAlign: "center",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    color: "#3C3C43",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 12,
  },
  inputContainer: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "rgba(60, 60, 67, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 34,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Outfit_500Medium",
    color: "#000000",
    padding: 0,
    margin: 0,
  },
  clearBtn: {
    marginLeft: 6,
    padding: 2,
  },
  horizontalDivider: {
    height: 0.5,
    backgroundColor: "rgba(60, 60, 67, 0.2)",
  },
  actionsRow: {
    flexDirection: "row",
    height: 44,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  verticalDivider: {
    width: 0.5,
    backgroundColor: "rgba(60, 60, 67, 0.2)",
  },
  cancelText: {
    fontSize: 17,
    fontFamily: "Outfit_400Regular",
    color: "#007AFF",
  },
  createText: {
    fontSize: 17,
    fontFamily: "Outfit_600SemiBold",
    color: "#007AFF",
  },
});
