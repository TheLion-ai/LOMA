import "react-native-gesture-handler";
import "@/global.css";
import { Slot } from "expo-router";
import Head from "expo-router/head";
import { DatabaseProvider } from "@/lib/database-context";
import { DatabaseInitialization } from "@/components/database-initialization";
import { ThemeProvider } from "@/lib/theme-context";

export default function Layout() {
  return (
    <>
      <Head>
        <title>LOMA | Medical Knowledge Database</title>
        <meta
          name="description"
          content="Medical knowledge database with AI-powered search and chat functionality"
        />
      </Head>
      <ThemeProvider>
        <DatabaseProvider>
          <DatabaseInitialization>
            <Slot />
          </DatabaseInitialization>
        </DatabaseProvider>
      </ThemeProvider>
    </>
  );
}
