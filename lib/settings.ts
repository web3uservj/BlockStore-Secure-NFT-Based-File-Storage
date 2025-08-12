/**
 * This file contains utilities for managing application settings
 */

// Define the shape of our application settings
export type AppSettings = {
  encryption: {
    enabled: boolean
    rememberPassword: boolean
  }
  blockchain: {
    autoVerify: boolean
    verificationInterval: number // in hours
  }
  interface: {
    theme: "light" | "dark" | "system"
    compactMode: boolean
  }
}

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  encryption: {
    enabled: true,
    rememberPassword: false,
  },
  blockchain: {
    autoVerify: true,
    verificationInterval: 24, // verify once a day
  },
  interface: {
    theme: "system",
    compactMode: false,
  },
}

// Local storage key for settings
const SETTINGS_STORAGE_KEY = "blockstore-settings"
const ENCRYPTION_KEY_STORAGE_KEY = "blockstore-encryption-key"

/**
 * Load settings from local storage
 */
export function loadSettings(): AppSettings {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!storedSettings) {
      return DEFAULT_SETTINGS
    }

    const parsedSettings = JSON.parse(storedSettings) as Partial<AppSettings>

    // Merge with default settings to ensure all properties exist
    return {
      encryption: {
        ...DEFAULT_SETTINGS.encryption,
        ...parsedSettings.encryption,
      },
      blockchain: {
        ...DEFAULT_SETTINGS.blockchain,
        ...parsedSettings.blockchain,
      },
      interface: {
        ...DEFAULT_SETTINGS.interface,
        ...parsedSettings.interface,
      },
    }
  } catch (error) {
    console.error("Error loading settings:", error)
    return DEFAULT_SETTINGS
  }
}

/**
 * Save settings to local storage
 */
export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error("Error saving settings:", error)
  }
}

/**
 * Save encryption key to local storage (only if rememberPassword is enabled)
 */
export function saveEncryptionKey(key: string): void {
  try {
    const settings = loadSettings()
    if (settings.encryption.rememberPassword) {
      localStorage.setItem(ENCRYPTION_KEY_STORAGE_KEY, key)
    }
  } catch (error) {
    console.error("Error saving encryption key:", error)
  }
}

/**
 * Load encryption key from local storage
 */
export function loadEncryptionKey(): string | null {
  try {
    return localStorage.getItem(ENCRYPTION_KEY_STORAGE_KEY)
  } catch (error) {
    console.error("Error loading encryption key:", error)
    return null
  }
}

/**
 * Clear saved encryption key
 */
export function clearEncryptionKey(): void {
  try {
    localStorage.removeItem(ENCRYPTION_KEY_STORAGE_KEY)
  } catch (error) {
    console.error("Error clearing encryption key:", error)
  }
}

/**
 * Update a specific setting
 */
export function updateSetting<K extends keyof AppSettings>(
  category: K,
  key: keyof AppSettings[K],
  value: any,
): AppSettings {
  const currentSettings = loadSettings()
  const newSettings = {
    ...currentSettings,
    [category]: {
      ...currentSettings[category],
      [key]: value,
    },
  }

  saveSettings(newSettings)
  return newSettings
}
