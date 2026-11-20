import { loadJSON, saveJSON } from './storage.js'

export const SETTINGS_KEY = 'pyviz.settings.v1'
export const SPEEDS = [0.5, 1, 2]
export const DEFAULT_SETTINGS = { camera: true, speak: false, speed: 1 }

export function cleanSettings(raw) {
  const s = { ...DEFAULT_SETTINGS }
  if (raw && typeof raw === 'object') {
    if (typeof raw.camera === 'boolean') s.camera = raw.camera
    if (typeof raw.speak === 'boolean') s.speak = raw.speak
    if (SPEEDS.includes(raw.speed)) s.speed = raw.speed
  }
  return s
}
export const loadSettings = (storage) => cleanSettings(loadJSON(SETTINGS_KEY, null, storage))
export const saveSettings = (s, storage) => saveJSON(SETTINGS_KEY, s, storage)
