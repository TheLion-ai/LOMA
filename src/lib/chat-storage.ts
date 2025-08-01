import AsyncStorage from "@react-native-async-storage/async-storage";

const CHATS_KEY = "chats";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
}

export const getChats = async (): Promise<Chat[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(CHATS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error("Failed to load chats.", e);
    return [];
  }
};

export const saveChat = async (chat: Chat): Promise<void> => {
  try {
    const chats = await getChats();
    const chatIndex = chats.findIndex((c) => c.id === chat.id);
    if (chatIndex > -1) {
      chats[chatIndex] = chat;
    } else {
      chats.push(chat);
    }
    const jsonValue = JSON.stringify(chats);
    await AsyncStorage.setItem(CHATS_KEY, jsonValue);
  } catch (e) {
    console.error("Failed to save chat.", e);
  }
};

export const createNewChat = (): Chat => {
  return {
    id: Date.now().toString(),
    title: "New chat",
    messages: [],
  };
};
