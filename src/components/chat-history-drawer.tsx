import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Pressable,
} from "react-native";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { Chat } from "@/lib/chat-storage";
import { MotiView } from "moti";
import { useTheme } from "@/lib/theme-context";
import { getCurrentTheme, theme } from "@/lib/theme";

interface ChatHistoryDrawerProps {
  chats: Chat[];
  onNewChat: () => void;
  onSelectChat: (chat: Chat) => void;
  onRenameChat: (chat: Chat, newTitle: string) => void;
  onDeleteChat: (chat: Chat) => void;
  onClose: () => void;
}

const ChatMenuItem = ({
  chat,
  onRenameChat,
  onDeleteChat,
  onSelectChat,
  isMenuVisible,
  onToggleMenu,
}: {
  chat: Chat;
  onRenameChat: (chat: Chat, newTitle: string) => void;
  onDeleteChat: (chat: Chat) => void;
  onSelectChat: (chat: Chat) => void;
  isMenuVisible: boolean;
  onToggleMenu: () => void;
}) => {
  const { isDark } = useTheme();
  const colors = getCurrentTheme(isDark);
  const [editing, setEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(chat.title);

  const itemStyles = StyleSheet.create({
    chatItemContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    chatItem: {
      paddingVertical: 12,
      flex: 1,
      color: colors.foreground,
      fontSize: 14,
    },
    dotsButton: {
      padding: 8,
    },
    popoverContent: {
      position: "absolute",
      right: 0,
      top: 30,
      backgroundColor: colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: 8,
      borderWidth: 1,
      borderColor: colors.border,
      ...theme.shadows.lg,
      zIndex: 1,
      width: 120,
    },
    popoverItem: {
      padding: 8,
    },
    popoverItemText: {
      color: colors.foreground,
      fontSize: 14,
    },
    deleteText: {
      color: colors.destructive,
      fontSize: 14,
    },
  });

  useEffect(() => {
    setTempTitle(chat.title);
  }, [chat.title]);

  const handleRename = () => {
    setEditing(true);
    onToggleMenu();
  };

  const handleSaveRename = () => {
    onRenameChat(chat, tempTitle.trim() === "" ? "New chat" : tempTitle);
    setEditing(false);
  };

  const handleDelete = () => {
    Alert.alert("Delete chat", "Are you sure you want to delete this chat?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        style: "destructive",
        onPress: () => onDeleteChat(chat),
      },
    ]);
    onToggleMenu();
  };

  return (
    <View style={itemStyles.chatItemContainer}>
      {editing ? (
        <TextInput
          style={[itemStyles.chatItem, { borderWidth: 1, borderColor: colors.border, borderRadius: theme.borderRadius.lg, paddingHorizontal: 8, backgroundColor: colors.input }]}
          value={tempTitle}
          onChangeText={setTempTitle}
          onBlur={handleSaveRename}
          onSubmitEditing={handleSaveRename}
          placeholderTextColor={colors.mutedForeground}
          autoFocus
        />
      ) : (
        <TouchableOpacity
          style={itemStyles.chatItem}
          onPress={() => onSelectChat(chat)}
        >
          <Text style={{ color: colors.foreground, fontSize: 14 }}>{chat.title}</Text>
        </TouchableOpacity>
      )}
      <View>
        <TouchableOpacity style={itemStyles.dotsButton} onPress={onToggleMenu}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
        {isMenuVisible && (
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "timing", duration: 150 }}
            style={itemStyles.popoverContent}
            onStartShouldSetResponder={() => true} // Prevent closing when clicking inside
          >
            <TouchableOpacity style={itemStyles.popoverItem} onPress={handleRename}>
              <Text style={itemStyles.popoverItemText}>Rename</Text>
            </TouchableOpacity>
            <TouchableOpacity style={itemStyles.popoverItem} onPress={handleDelete}>
              <Text style={itemStyles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </MotiView>
        )}
      </View>
    </View>
  );
};

export function ChatHistoryDrawer({
  chats,
  onNewChat,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
  onClose,
}: ChatHistoryDrawerProps) {
  const { isDark } = useTheme();
  const colors = getCurrentTheme(isDark);
  const [visibleMenuChatId, setVisibleMenuChatId] = useState<string | null>(
    null
  );

  const drawerStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 16,
      paddingTop: 48,
    },
    closeButton: {
      position: "absolute",
      top: 48,
      right: 16,
      zIndex: 1,
    },
    newChatButton: {
      marginBottom: 16,
    },
    separator: {
      marginVertical: 16,
    },
  });

  return (
    <Pressable
      style={drawerStyles.container}
      onPress={() => setVisibleMenuChatId(null)}
    >
      <Button style={drawerStyles.newChatButton} onPress={onNewChat}>
        <Text>New chat </Text>
        <FontAwesome name="plus" size={16} color={colors.primaryForeground} />
      </Button>
      <Separator style={drawerStyles.separator} />
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        onScrollBeginDrag={() => setVisibleMenuChatId(null)}
        renderItem={({ item }) => (
          <ChatMenuItem
            chat={item}
            onRenameChat={onRenameChat}
            onDeleteChat={onDeleteChat}
            onSelectChat={onSelectChat}
            isMenuVisible={visibleMenuChatId === item.id}
            onToggleMenu={() =>
              setVisibleMenuChatId(
                visibleMenuChatId === item.id ? null : item.id
              )
            }
          />
        )}
      />
    </Pressable>
  );
}


