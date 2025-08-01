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
  const [editing, setEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(chat.title);

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
    <View style={styles.chatItemContainer}>
      {editing ? (
        <TextInput
          style={styles.chatItem}
          value={tempTitle}
          onChangeText={setTempTitle}
          onBlur={handleSaveRename}
          onSubmitEditing={handleSaveRename}
          autoFocus
        />
      ) : (
        <TouchableOpacity
          style={styles.chatItem}
          onPress={() => onSelectChat(chat)}
        >
          <Text>{chat.title}</Text>
        </TouchableOpacity>
      )}
      <View>
        <TouchableOpacity style={styles.dotsButton} onPress={onToggleMenu}>
          <Ionicons name="ellipsis-horizontal" size={20} color="gray" />
        </TouchableOpacity>
        {isMenuVisible && (
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "timing", duration: 150 }}
            style={styles.popoverContent}
            onStartShouldSetResponder={() => true} // Prevent closing when clicking inside
          >
            <TouchableOpacity style={styles.popoverItem} onPress={handleRename}>
              <Text>Rename</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.popoverItem} onPress={handleDelete}>
              <Text style={styles.deleteText}>Delete</Text>
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
  const [visibleMenuChatId, setVisibleMenuChatId] = useState<string | null>(
    null
  );

  return (
    <Pressable
      style={styles.container}
      onPress={() => setVisibleMenuChatId(null)}
    >
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <FontAwesome name="times" size={24} color="black" />
      </TouchableOpacity>
      <Button style={styles.newChatButton} onPress={onNewChat}>
        <Text>New chat </Text>
        <FontAwesome name="plus" size={16} color="white" />
      </Button>
      <Separator style={styles.separator} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
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
  chatItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chatItem: {
    paddingVertical: 12,
    flex: 1,
  },
  dotsButton: {
    padding: 8,
  },
  popoverContent: {
    position: "absolute",
    right: 0,
    top: 30,
    backgroundColor: "white",
    borderRadius: 8,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1,
    width: 120,
  },
  popoverItem: {
    padding: 8,
  },
  deleteText: {
    color: "red",
  },
});
