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

const updateStoredChats = async (
  updater: (chats: Chat[]) => Chat[]
): Promise<Chat[]> => {
  try {
    const currentChats = await getChats();
    const newChats = updater(currentChats);
    const jsonValue = JSON.stringify(newChats);
    await AsyncStorage.setItem(CHATS_KEY, jsonValue);
    return newChats;
  } catch (e) {
    console.error("Failed to update chats.", e);
    return []; // Return empty array on failure
  }
};

export const saveChat = async (chat: Chat): Promise<Chat[]> => {
  return updateStoredChats((chats) => {
    const chatIndex = chats.findIndex((c) => c.id === chat.id);
    if (chatIndex > -1) {
      chats[chatIndex] = chat;
    } else {
      chats.unshift(chat); // Add to the beginning
    }
    return chats;
  });
};

export const createNewChat = (): Chat => {
  return {
    id: Date.now().toString(),
    title: "New chat",
    messages: [],
  };
};

export const deleteChat = async (chatId: string): Promise<Chat[]> => {
  return updateStoredChats((chats) => chats.filter((c) => c.id !== chatId));
};
