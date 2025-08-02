import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import ChatComponent from "@/components/chat";
import { ChatHistoryDrawer } from "@/components/chat-history-drawer";
import { Drawer } from "react-native-drawer-layout";
import DrawerTabHeader from "@/components/ui/drawer-tab-header";
import {
  getChats,
  saveChat,
  createNewChat,
  deleteChat,
  Chat as ChatType,
} from "@/lib/chat-storage";

export default function ChatScreen() {
  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState<ChatType[]>([]);
  const [activeChat, setActiveChat] = useState<ChatType | null>(null);

  const loadChats = async () => {
    let loadedChats = await getChats();
    if (loadedChats.length === 0) {
      const newChat = createNewChat();
      loadedChats = await saveChat(newChat); // Save the new chat and get the updated list
    }
    setChats(loadedChats);
    setActiveChat(loadedChats[0]);
  };

  useEffect(() => {
    loadChats();
  }, []);

  const handleNewChat = async () => {
    const emptyChat = chats.find(
      (chat) => chat.title === "New chat" && chat.messages.length <= 1
    );

    if (emptyChat) {
      setActiveChat(emptyChat);
    } else {
      const newChat = createNewChat();
      const updatedChats = await saveChat(newChat);
      setChats(updatedChats);
      setActiveChat(newChat);
    }
    setOpen(false);
  };

  const handleSelectChat = (chat: ChatType) => {
    setActiveChat(chat);
    setOpen(false);
  };

  const onMessagesChange = useCallback(async (messages: any) => {
    setActiveChat((prev) => {
      if (!prev) return null;
      const updatedChat = { ...prev, messages };
      saveChat(updatedChat).then(setChats);
      return updatedChat;
    });
  }, []);

  const onTitleChange = useCallback(async (title: string) => {
    setActiveChat((prev) => {
      if (!prev) return null;
      const updatedChat = { ...prev, title };
      saveChat(updatedChat).then(setChats);
      return updatedChat;
    });
  }, []);

  const onRenameChat = async (chat: ChatType, newTitle: string) => {
    const updatedChat = { ...chat, title: newTitle };
    const updatedChats = await saveChat(updatedChat);
    setChats(updatedChats);
    if (activeChat?.id === chat.id) {
      setActiveChat(updatedChat);
    }
  };

  const onDeleteChat = async (chat: ChatType) => {
    let updatedChats = await deleteChat(chat.id);
    if (updatedChats.length === 0) {
      const newChat = createNewChat();
      updatedChats = await saveChat(newChat);
    }
    setChats(updatedChats);
    if (activeChat?.id === chat.id) {
      setActiveChat(updatedChats[0]);
    }
  };

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
            onRenameChat={onRenameChat}
            onDeleteChat={onDeleteChat}
            onClose={() => setOpen(false)}
          />
        );
      }}
    >
      <View style={styles.container}>
        <DrawerTabHeader
          title="LOMA Chat"
          onMenuPress={() => setOpen(true)}
          isDrawerOpen={open}
        />
        {activeChat && (
          <ChatComponent
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
});
