import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { FontAwesome } from "@expo/vector-icons";
import { Chat } from "@/lib/chat-storage";

interface ChatHistoryDrawerProps {
  chats: Chat[];
  onNewChat: () => void;
  onSelectChat: (chat: Chat) => void;
  onClose: () => void;
}

export function ChatHistoryDrawer({
  chats,
  onNewChat,
  onSelectChat,
  onClose,
}: ChatHistoryDrawerProps) {
  return (
    <View style={styles.container}>
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
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatItem}
            onPress={() => onSelectChat(item)}
          >
            <Text>{item.title}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
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
  chatItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
});
