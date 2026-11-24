/**
 * Baseline feature IDs present in launcher v2.0.0 and v2.0.1.
 * Existing users migrating to v2.0.2 will have these marked as "seen" automatically,
 * ensuring they never light up with a badge dot.
 *
 * New 2.0.2 features (NOT included here, so they will light up as new):
 * - header.mods (Mods dialog and management)
 * - settings.actions.freshInstall (Fresh install button in actions)
 * - settings.profiles.delete (Delete game profile button with safety countdown)
 * - settings.profiles.reinstall (Reinstall game button inside profiles)
 */
export const BASELINE_2_0_0_BADGES: string[] = [
  "header.settings",
  "install.dir",
  "install.lang",
  "main.actions.dgvoodoo",
  "main.actions.donate",
  "main.profiles",
  "settings.actions",
  "settings.actions.dgvoodoo",
  "settings.actions.export",
  "settings.actions.import",
  "settings.integrations.discord",
  "settings.integrations.perf",
  "settings.language",
  "settings.profiles",
  "settings.profiles.browse",
  "settings.profiles.revert",
  "settings.profiles.save",
  "welcome.browse",
  "welcome.install",
];
