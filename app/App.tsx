import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { saveConfig } from "@/lib/config/save";
import type { LauncherConfig } from "@/lib/config/types";
import { getDevArgs } from "@/lib/dev/cli";
import { LanguageProvider } from "@/lib/lang";
import { installationManager } from "@/lib/manager/install";
import { Flex, ToastProvider, theme, View, Views } from "@/ui";
import { InstallView } from "./views/InstallView";
import { MainView } from "./views/MainView";
import { SettingsView } from "./views/SettingsView";
import { WelcomeView } from "./views/WelcomeView";

interface AppProps {
  initialConfig: LauncherConfig;
  isFirstLaunch?: boolean;
}

export function App({ initialConfig, isFirstLaunch = false }: AppProps) {
  const devArgs = getDevArgs();
  const [config, setConfig] = useState<LauncherConfig>(() => {
    if (devArgs.isDev && devArgs.lang) {
      return { ...initialConfig, launcherLang: devArgs.lang };
    }
    return initialConfig;
  });

  const getInitialView = (): "welcome" | "main" | "settings" | "install" => {
    if (devArgs.isDev && devArgs.view) {
      return devArgs.view;
    }
    return isFirstLaunch ? "welcome" : "main";
  };

  const [activeView, setActiveView] = useState<"welcome" | "main" | "settings" | "install">(
    getInitialView,
  );
  const [installSource, setInstallSource] = useState<"main" | "settings">("main");

  const isMain = activeView === "main";
  const isReinstall = installSource === "settings";

  const handleUpdateConfig = async (nextConfig: LauncherConfig) => {
    setConfig(nextConfig);
    await saveConfig(nextConfig);
  };

  const handleAutoDetectLanguage = (detectedLang: "en" | "ru" | "ua") => {
    if (devArgs.isDev && devArgs.disableAutoDetectLanguage) {
      return;
    }
    const nextCfg: LauncherConfig = { ...config, launcherLang: detectedLang };
    handleUpdateConfig(nextCfg);
  };

  const handleSelectExistingFromWelcome = async (gameDir: string) => {
    const updatedProfiles = (config.gameProfiles || []).map((p) =>
      p.id === (config.activeProfileId || "slot-1") ? { ...p, path: gameDir } : p,
    );
    const nextCfg: LauncherConfig = { ...config, gameDir, gameProfiles: updatedProfiles };
    await handleUpdateConfig(nextCfg);
    setActiveView("main");
  };

  const handleInstallSuccess = useCallback((installedPath: string) => {
    setConfig((prevConfig) => {
      const updatedProfiles = (prevConfig.gameProfiles || []).map((p) =>
        p.id === (prevConfig.activeProfileId || "slot-1") ? { ...p, path: installedPath } : p,
      );
      return {
        ...prevConfig,
        gameDir: installedPath,
        gameProfiles: updatedProfiles,
      };
    });
    setActiveView("main");
  }, []);

  useEffect(() => {
    return installationManager.onInstalled((installedPath, updatedConfig) => {
      if (updatedConfig) {
        setConfig(updatedConfig);
      } else {
        handleInstallSuccess(installedPath);
      }
    });
  }, [handleInstallSuccess]);

  const handleCancelInstall = () => {
    setActiveView(installSource === "settings" ? "settings" : "main");
  };

  return (
    <LanguageProvider lang={config.launcherLang}>
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
            onValueChange={(id) => setActiveView(id as "welcome" | "main" | "settings" | "install")}
          >
            <View id="welcome" transition="fade" style={{ width: "100%", height: "100%" }}>
              <WelcomeView
                skipAutoDetect={devArgs.isDev && devArgs.disableAutoDetectLanguage}
                onAutoDetectLanguage={handleAutoDetectLanguage}
                onSelectExistingGame={handleSelectExistingFromWelcome}
                onNavigateInstall={() => {
                  setInstallSource("main");
                  setActiveView("install");
                }}
              />
            </View>

            <View id="main" transition="fade" style={{ width: "100%", height: "100%" }}>
              <MainView config={config} onChangeConfig={handleUpdateConfig} />
            </View>

            <View id="settings" transition="slide-left" style={{ width: "100%", height: "100%" }}>
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

            <View id="install" transition="slide-left" style={{ width: "100%", height: "100%" }}>
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
    </LanguageProvider>
  );
}
