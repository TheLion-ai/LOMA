import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import Chat from "@/components/chat";
import { ChatHistoryDrawer } from "@/components/chat-history-drawer";
import { Drawer } from "react-native-drawer-layout";
import { FontAwesome } from "@expo/vector-icons";
import {
  getChats,
  saveChat,
  createNewChat,
  Chat as ChatType,
} from "@/lib/chat-storage";

export default function ChatScreen() {
  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState<ChatType[]>([]);
  const [activeChat, setActiveChat] = useState<ChatType | null>(null);

  useEffect(() => {
    const loadChats = async () => {
      const loadedChats = await getChats();
      setChats(loadedChats);
      if (loadedChats.length > 0) {
        setActiveChat(loadedChats[0]);
      } else {
        const newChat = createNewChat();
        setActiveChat(newChat);
        setChats([newChat]);
      }
    };
    loadChats();
  }, []);

  const handleNewChat = () => {
    const newChat = createNewChat();
    setChats([newChat, ...chats]);
    setActiveChat(newChat);
    setOpen(false);
  };

  const handleSelectChat = (chat: ChatType) => {
    setActiveChat(chat);
    setOpen(false);
  };

  const onMessagesChange = useCallback((messages: any) => {
    setActiveChat((prev) => {
      if (!prev) return null;
      const updatedChat = { ...prev, messages };
      saveChat(updatedChat);
      setChats((prevChats) =>
        prevChats.map((c) => (c.id === updatedChat.id ? updatedChat : c))
      );
      return updatedChat;
    });
  }, []);

  const onTitleChange = useCallback((title: string) => {
    setActiveChat((prev) => {
      if (!prev) return null;
      const updatedChat = { ...prev, title };
      saveChat(updatedChat);
      setChats((prevChats) =>
        prevChats.map((c) => (c.id === updatedChat.id ? updatedChat : c))
      );
      return updatedChat;
    });
  }, []);

  return (
    <Drawer
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      renderDrawerContent={() => {
        return (
          <ChatHistoryDrawer
            chats={chats}
            onNewChat={handleNewChat}
            onSelectChat={handleSelectChat}
            onClose={() => setOpen(false)}
          />
        );
      }}
    >
      <View style={styles.container}>
        {!open && (
          <TouchableOpacity
            onPress={() => setOpen(true)}
            style={styles.burgerButton}
          >
            <FontAwesome name="bars" size={24} color="black" />
          </TouchableOpacity>
        )}
        {activeChat && (
          <Chat
            key={activeChat.id}
            activeChat={activeChat}
            messages={activeChat.messages}
            onMessagesChange={onMessagesChange}
            onTitleChange={onTitleChange}
          />
        )}
      </View>
    </Drawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  burgerButton: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 1,
    padding: 10,
  },
});
