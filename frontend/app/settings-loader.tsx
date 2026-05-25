'use client';

import { useSettings } from './settings/hooks/use-settings';

export function SettingsLoader() {
  useSettings();
  return null;
}
