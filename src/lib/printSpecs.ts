/**
 * Sizes and rules from the Shirt Image Spec (Epic Sports ticket 968876, Nov 13, 2026) and the Team Logo and Icon
 * Spec. Change them here and the new-design dialog, export presets and export checks follow.
 */
export const DEFAULT_DPI = 300

/** Epic Sports' limits for a chest print, in pixels at 300 DPI */
export const EPIC = {
  maxSide: 3300, // 11 in, either direction
  minLongSide: 1500, // Epic's floor; never a target
  goodLongSide: 2250, // warn below this
  maxInks: 3,
  /** Colors under this share of the art are antialiasing, not inks */
  inkMinShare: 0.005,
}

export interface CanvasPreset {
  id: string
  name: string
  use: string
  width: number
  height: number
  dpi: number
}

export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: 'chest', name: 'Chest standard', use: 'Most front designs, 9 in', width: 2700, height: 2700, dpi: 300 },
  { id: 'compact', name: 'Compact', use: 'Smaller marks, youth shirts, 7.5 in', width: 2250, height: 2250, dpi: 300 },
  { id: 'wide', name: 'Wide', use: 'Long wordmarks, 10 in', width: 3000, height: 1500, dpi: 300 },
  { id: 'max', name: 'Max', use: "Epic's ceiling, 11 × 11 in", width: 3300, height: 3300, dpi: 300 },
  { id: 'logo', name: 'Primary logo', use: 'OTC Sports team page, 1600 px wide', width: 1600, height: 800, dpi: 72 },
  { id: 'icon', name: 'Square icon', use: '2D Sports and GameChanger, 600 × 600', width: 600, height: 600, dpi: 72 },
]

export type ExportTarget = 'shirt' | 'logo' | 'icon' | 'custom'

export interface ExportSettings {
  target: ExportTarget
  /** For 'custom' */
  dpi: number
  widthPx: number
  /** 'document' keeps the pixels as they are */
  sizeMode: 'document' | 'width'
  resample: 'hard' | 'smooth'
  background: 'transparent' | 'shirt' | 'board' | 'custom'
  customBackground: string
  trim: boolean
  /** Extra files for the Epic package */
  includeMockup: boolean
  includeColors: boolean
  includeProject: boolean
}

export const DEFAULT_EXPORT: ExportSettings = {
  target: 'shirt',
  dpi: DEFAULT_DPI,
  widthPx: 2700,
  sizeMode: 'document',
  resample: 'hard',
  background: 'transparent',
  customBackground: '#FFFFFF',
  trim: true,
  includeMockup: true,
  includeColors: true,
  includeProject: true,
}

export interface TargetInfo {
  name: string
  goesTo: string
  /** What the export does to the art's size */
  sizing: { kind: 'keep' } | { kind: 'width'; width: number; pad: number } | { kind: 'square'; size: number; pad: number }
  dpi: number | null
  /** The site's background, for the check preview */
  previewBg: string
  /** File name suffix */
  suffix: (w: number, h: number) => string
}

export const TARGETS: Record<Exclude<ExportTarget, 'custom'>, TargetInfo> = {
  shirt: {
    name: 'Shirt print', goesTo: 'Epic Sports upload', sizing: { kind: 'keep' }, dpi: 300, previewBg: '#4B5320',
    suffix: () => '300dpi',
  },
  logo: {
    name: 'Primary logo', goesTo: 'OTC Sports team page', sizing: { kind: 'width', width: 1600, pad: 40 }, dpi: null,
    previewBg: '#FFFFFF', suffix: (w) => `logo-${w}`,
  },
  icon: {
    name: 'Square icon', goesTo: '2D Sports and GameChanger', sizing: { kind: 'square', size: 600, pad: 30 },
    dpi: null, previewBg: '#E8E8E8', suffix: (w) => `icon-${w}`,
  },
}

/** team-design-colorway: lowercase with hyphens */
export function slug(...parts: string[]): string {
  return parts
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'design'
}
