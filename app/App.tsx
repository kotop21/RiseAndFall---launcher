import { useCallback, useEffect, useState } from "react";
import { DevOverlay } from "@/components/dev";
import { Header } from "@/components/Header";
import { RequiredModsWatcher } from "@/components/RequiredModsDialog";
import { saveConfig } from "@/lib/config/save";
import type { LauncherConfig } from "@/lib/config/types";
import { getDevArgs } from "@/lib/dev";
import { FeatureBadgeProvider } from "@/lib/features";
import { LanguageProvider } from "@/lib/lang";
import { logger } from "@/lib/logger";
import { installationManager, useIsInstalling } from "@/lib/manager/install";
import { DialogProvider, Flex, ToastProvider, theme, View, Views } from "@/ui";
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
  const [installSource, setInstallSource] = useState<"welcome" | "main" | "settings">("main");
  const [isReinstall, setIsReinstall] = useState(false);
  const [installTargetDir, setInstallTargetDir] = useState<string | undefined>(undefined);
  const [installPrevProfileId, setInstallPrevProfileId] = useState<string | null>(null);

  const isMain = activeView === "main";
  const isInstalling = useIsInstalling();

  const handleUpdateConfig = async (nextConfig: LauncherConfig) => {
    setConfig(nextConfig);
    await saveConfig(nextConfig);
  };

  const handleAutoDetectLanguage = useCallback(
    (detectedLang: "en" | "ru" | "ua") => {
      if (devArgs.isDev && devArgs.disableAutoDetectLanguage) {
        return;
      }
      setConfig((prevConfig) => {
        if (prevConfig.launcherLang === detectedLang) {
          return prevConfig;
        }
        const nextCfg: LauncherConfig = { ...prevConfig, launcherLang: detectedLang };
        saveConfig(nextCfg).catch((err) => {
          logger.error("config", "Failed saving auto-detected language to config:", err);
        });
        return nextCfg;
      });
    },
    [devArgs.isDev, devArgs.disableAutoDetectLanguage],
  );

  const handleCompleteWelcome = useCallback(() => {
    setConfig((prevConfig) => {
      if (prevConfig.welcomeSeen) {
        return prevConfig;
      }
      const nextCfg: LauncherConfig = { ...prevConfig, welcomeSeen: true };
      saveConfig(nextCfg).catch((err) => {
        logger.error("config", "Failed saving welcomeSeen to config:", err);
      });
      return nextCfg;
    });
  }, []);

  const handleSelectExistingFromWelcome = async (gameDir: string) => {
    let nextCfg: LauncherConfig | null = null;
    setConfig((prev) => {
      const updatedProfiles = (prev.gameProfiles || []).map((p) =>
        p.id === (prev.activeProfileId || "slot-1") ? { ...p, path: gameDir } : p,
      );
      nextCfg = {
        ...prev,
        gameDir,
        gameProfiles: updatedProfiles,
      };
      return nextCfg;
    });
    if (nextCfg) {
      await saveConfig(nextCfg);
    }
    setActiveView("main");
  };

  const handleInstallSuccess = useCallback((installedPath: string) => {
    setInstallPrevProfileId(null);
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
      setInstallPrevProfileId(null);
      if (updatedConfig) {
        setConfig(updatedConfig);
      } else {
        handleInstallSuccess(installedPath);
      }
      setActiveView("main");
    });
  }, [handleInstallSuccess]);

  const handleOpenReinstall = useCallback(
    (targetDir?: string) => {
      setIsReinstall(true);
      setInstallTargetDir(targetDir || config.gameDir);
      setInstallPrevProfileId(null);
      setInstallSource("settings");
      setActiveView("install");
    },
    [config.gameDir],
  );

  const handleOpenNewInstall = useCallback(async () => {
    const profiles = config.gameProfiles || [];
    const emptySlot = profiles.find((p) => !p.path?.trim());

    if (!emptySlot) {
      return;
    }

    const prevActiveId = config.activeProfileId || "slot-1";
    setInstallPrevProfileId(prevActiveId);
    setIsReinstall(false);
    setInstallTargetDir(undefined);
    setInstallSource("settings");

    let configToSave: LauncherConfig | null = null;
    setConfig((prev) => {
      if (prev.activeProfileId === emptySlot.id) {
        return prev;
      }
      const updated: LauncherConfig = {
        ...prev,
        activeProfileId: emptySlot.id,
        gameDir: "",
      };
      configToSave = updated;
      return updated;
    });

    if (configToSave) {
      try {
        await saveConfig(configToSave);
      } catch (err) {
        logger.error("config", "Failed saving active profile for new install:", err);
      }
    }

    setActiveView("install");
  }, [config]);

  const handleCancelInstall = useCallback(() => {
    if (installPrevProfileId) {
      const prevId = installPrevProfileId;
      setInstallPrevProfileId(null);

      setConfig((prev) => {
        const currentActive = prev.gameProfiles?.find((p) => p.id === prev.activeProfileId);
        if (!currentActive?.path?.trim() && prevId !== prev.activeProfileId) {
          const prevProfile = prev.gameProfiles?.find((p) => p.id === prevId);
          const restoredConfig: LauncherConfig = {
            ...prev,
            activeProfileId: prevId,
            gameDir: prevProfile?.path || prev.gameDir,
            gameArg: prevProfile?.gameArg || prev.gameArg,
          };
          saveConfig(restoredConfig).catch((err) => {
            logger.error("config", "Failed restoring profile on install cancel:", err);
          });
          return restoredConfig;
        }
        return prev;
      });
    }

    if (installSource === "welcome") {
      setActiveView("welcome");
    } else if (installSource === "settings") {
      setActiveView("settings");
    } else {
      setActiveView("main");
    }
  }, [installPrevProfileId, installSource]);

  const handleSeenBadgesChange = useCallback((nextSeen: string[]) => {
    setConfig((prev) => {
      const nextConfig = { ...prev, seenBadges: nextSeen };
      saveConfig(nextConfig).catch((err) => {
        logger.error("config", "Failed saving seen badges to config:", err);
      });
      return nextConfig;
    });
  }, []);

  return (
    <LanguageProvider lang={config.launcherLang}>
      <ToastProvider defaultPosition="top-right">
        <DialogProvider>
          <FeatureBadgeProvider
            seenBadges={config.seenBadges || []}
            onSeenChange={handleSeenBadgesChange}
          >
            <Flex
              direction="column"
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: theme.colors.bg,
                paddingBottom: isMain ? (isInstalling ? 110 : 72) : 0,
              }}
            >
              <Views
                value={activeView}
                onValueChange={(id) =>
                  setActiveView(id as "welcome" | "main" | "settings" | "install")
                }
              >
                <View id="welcome" transition="fade" style={{ width: "100%", height: "100%" }}>
                  <WelcomeView
                    welcomeSeen={Boolean(config.welcomeSeen)}
                    onCompleteWelcome={handleCompleteWelcome}
                    skipAutoDetect={devArgs.isDev && devArgs.disableAutoDetectLanguage}
                    onAutoDetectLanguage={handleAutoDetectLanguage}
                    onSelectExistingGame={handleSelectExistingFromWelcome}
                    onNavigateInstall={() => {
                      handleCompleteWelcome();
                      setIsReinstall(false);
                      setInstallTargetDir(undefined);
                      setInstallPrevProfileId(null);
                      setInstallSource("welcome");
                      setActiveView("install");
                    }}
                  />
                </View>

                <View id="main" transition="fade" style={{ width: "100%", height: "100%" }}>
                  <MainView config={config} onChangeConfig={handleUpdateConfig} />
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
                    onOpenInstall={handleOpenReinstall}
                    onOpenNewInstall={handleOpenNewInstall}
                  />
                </View>

                <View
                  id="install"
                  transition="slide-left"
                  style={{ width: "100%", height: "100%" }}
                >
                  <InstallView
                    defaultInstallPath={
                      isReinstall ? installTargetDir || config.gameDir : undefined
                    }
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
                    setIsReinstall(false);
                    setInstallTargetDir(undefined);
                    setInstallPrevProfileId(null);
                    setInstallSource("main");
                    setActiveView("install");
                  }}
                />
              )}
            </Flex>
            <RequiredModsWatcher gameDir={config.gameDir} activeView={activeView} />
            <DevOverlay />
          </FeatureBadgeProvider>
        </DialogProvider>
      </ToastProvider>
    </LanguageProvider>
  );
}
