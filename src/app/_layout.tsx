import "react-native-gesture-handler";
import "@/global.css";
import { Slot } from "expo-router";
import Head from "expo-router/head";

export default function Layout() {
  return (
    <>
      <Head>
        <title>Gemma 3n Chat | AI Assistant</title>
        <meta
          name="description"
          content="Local AI chat app powered by Gemma 3n language model"
        />
      </Head>
      <Slot />
    </>
  );
}
