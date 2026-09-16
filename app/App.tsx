import { useState } from "react";
import { ToastProvider, Flex, Views, View, theme } from "@/ui";
import { Header } from "@/components/Header";
import { MainView } from "./views/MainView";
import { SettingsView } from "./views/SettingsView";
import { InstallView } from "./views/InstallView";
import { WelcomeView } from "./views/WelcomeView";
import { saveConfig } from "@/lib/config/save";
import type { LauncherConfig } from "@/lib/config/types";

interface AppProps {
  initialConfig: LauncherConfig;
  isFirstLaunch?: boolean;
}

export function App({ initialConfig, isFirstLaunch = false }: AppProps) {
  const [config, setConfig] = useState<LauncherConfig>(initialConfig);
  const [activeView, setActiveView] = useState<"welcome" | "main" | "settings" | "install">(
    isFirstLaunch ? "welcome" : "main",
  );
  const [installSource, setInstallSource] = useState<"main" | "settings">(
    "main",
  );

  const isMain = activeView === "main";
  const isReinstall = installSource === "settings";

  const handleUpdateConfig = async (nextConfig: LauncherConfig) => {
    setConfig(nextConfig);
    await saveConfig(nextConfig);
  };

  const handleSelectExistingFromWelcome = async (gameDir: string) => {
    const nextCfg: LauncherConfig = { ...config, gameDir };
    await handleUpdateConfig(nextCfg);
    setActiveView("main");
  };

  const handleInstallSuccess = (installedPath: string) => {
    const nextCfg: LauncherConfig = { ...config, gameDir: installedPath };
    setConfig(nextCfg);
    setActiveView("main");
  };

  const handleCancelInstall = () => {
    setActiveView(installSource === "settings" ? "settings" : "main");
  };

  return (
    <ToastProvider defaultPosition="top-right">
      <Flex
        direction="column"
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: theme.colors.bg,
          paddingBottom: isMain ? 72 : 0,
        }}
      >
        <Views
          value={activeView}
          onValueChange={(id) =>
            setActiveView(id as "welcome" | "main" | "settings" | "install")
          }
        >
          <View
            id="welcome"
            transition="fade"
            style={{ width: "100%", height: "100%" }}
          >
            <WelcomeView
              onSelectExistingGame={handleSelectExistingFromWelcome}
              onNavigateInstall={() => {
                setInstallSource("main");
                setActiveView("install");
              }}
            />
          </View>

          <View
            id="main"
            transition="fade"
            style={{ width: "100%", height: "100%" }}
          >
            <MainView gameDir={config.gameDir} />
          </View>

          <View
            id="settings"
            transition="slide-left"
            style={{ width: "100%", height: "100%" }}
          >
            <SettingsView
              config={config}
              onChangeConfig={handleUpdateConfig}
              onBack={() => setActiveView("main")}
              onOpenInstall={() => {
                setInstallSource("settings");
                setActiveView("install");
              }}
            />
          </View>

          <View
            id="install"
            transition="slide-left"
            style={{ width: "100%", height: "100%" }}
          >
            <InstallView
              defaultInstallPath={config.gameDir}
              isReinstall={isReinstall}
              onInstalled={handleInstallSuccess}
              onCancel={handleCancelInstall}
            />
          </View>
        </Views>

        {isMain && (
          <Header
            config={config}
            onConfigChange={setConfig}
            onOpenSettings={() => setActiveView("settings")}
            onOpenInstall={() => {
              setInstallSource("main");
              setActiveView("install");
            }}
          />
        )}
      </Flex>
    </ToastProvider>
  );
}
