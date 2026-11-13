/**
 * Swatches for the color panel. Epic Sports' color wheel will replace TEAM_COLORS when it arrives: put its names and
 * hex values here and everything else picks them up.
 */
export interface Swatch {
  name: string
  hex: string
}

export const TEAM_COLORS: Swatch[] = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Athletic Gray', hex: '#9EA2A2' },
  { name: 'Charcoal', hex: '#4A4F55' },
  { name: 'Navy', hex: '#1F2A44' },
  { name: 'Royal', hex: '#1D4F91' },
  { name: 'Columbia Blue', hex: '#75B2DD' },
  { name: 'Teal', hex: '#00808B' },
  { name: 'Kelly Green', hex: '#00843D' },
  { name: 'Forest', hex: '#154734' },
  { name: 'Lime', hex: '#78BE20' },
  { name: 'Athletic Gold', hex: '#FFB81C' },
  { name: 'Yellow', hex: '#FEDD00' },
  { name: 'Vegas Gold', hex: '#C5B783' },
  { name: 'Orange', hex: '#FF6A13' },
  { name: 'Texas Orange', hex: '#BF5700' },
  { name: 'Red', hex: '#C8102E' },
  { name: 'Cardinal', hex: '#9D2235' },
  { name: 'Maroon', hex: '#6F263D' },
  { name: 'Pink', hex: '#F395C7' },
  { name: 'Purple', hex: '#582C83' },
  { name: 'Brown', hex: '#5C4033' },
]

/** Common blank shirt colors for the preview */
export const SHIRT_COLORS: Swatch[] = [
  { name: 'Military Green', hex: '#4B5320' },
  { name: 'Navy', hex: '#202A44' },
  { name: 'White', hex: '#F7F7F5' },
  { name: 'Ash', hex: '#D9D9D6' },
  { name: 'Sport Gray', hex: '#A2A4A3' },
  { name: 'Charcoal', hex: '#4A4F55' },
  { name: 'Black', hex: '#1B1B1D' },
  { name: 'Royal', hex: '#1D4F91' },
  { name: 'Carolina Blue', hex: '#7BAFD4' },
  { name: 'Red', hex: '#B8102E' },
  { name: 'Cardinal', hex: '#8A1E32' },
  { name: 'Maroon', hex: '#5C2132' },
  { name: 'Orange', hex: '#F2672A' },
  { name: 'Gold', hex: '#FFB81C' },
  { name: 'Kelly Green', hex: '#00843D' },
  { name: 'Forest', hex: '#1E3D2F' },
  { name: 'Purple', hex: '#4B2C7A' },
]

/** Backgrounds behind the design in the square preview */
export const BOARD_COLORS: Swatch[] = [
  { name: 'White (OTC Sports page)', hex: '#FFFFFF' },
  { name: 'Light gray (2D Sports page)', hex: '#E8E8E8' },
  { name: 'Gray', hex: '#9EA2A2' },
  { name: 'Black', hex: '#000000' },
  { name: 'Navy', hex: '#1F2A44' },
  { name: 'Military Green', hex: '#4B5320' },
]

/** The palette name for a color, if it's one of the team colors */
export function colorName(hex: string): string | undefined {
  return TEAM_COLORS.find((s) => s.hex.toUpperCase() === hex.toUpperCase())?.name
}
