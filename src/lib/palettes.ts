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

/** A blank shirt's color list, so the preview shows shirts that can actually be ordered */
export interface ShirtCollection {
  id: string
  name: string
  /** The exact blank and where it comes from */
  shirt: string
  colors: Swatch[]
}

/*
 * Hex values were read from each color's product photo (Nov 2026), so they are close to the real fabric but not exact.
 * Heathers show as their average color.
 */
const A4_N3142: Swatch[] = [
  { name: 'White', hex: '#F1F2F4' },
  { name: 'Silver', hex: '#B1B2AD' },
  { name: 'Graphite', hex: '#55595A' },
  { name: 'Black', hex: '#1B1D1C' },
  { name: 'Light Yellow', hex: '#F8EFAC' },
  { name: 'Vegas Gold', hex: '#CEB280' },
  { name: 'Gold', hex: '#FEBD0D' },
  { name: 'Safety Orange', hex: '#FA5617' },
  { name: 'Athletic Orange', hex: '#FA5617' },
  { name: 'Pink', hex: '#EFA7BB' },
  { name: 'Coral', hex: '#FE415B' },
  { name: 'Fuchsia', hex: '#C33C77' },
  { name: 'Scarlet', hex: '#BB2032' },
  { name: 'Cardinal', hex: '#682E3D' },
  { name: 'Maroon', hex: '#4B2937' },
  { name: 'Pastel Mint', hex: '#BEECE2' },
  { name: 'Safety Yellow', hex: '#D4F800' },
  { name: 'Lime', hex: '#A6E84A' },
  { name: 'Olive', hex: '#796E5C' },
  { name: 'Teal', hex: '#2B8094' },
  { name: 'Military Green', hex: '#3E3F1F' },
  { name: 'Kelly', hex: '#2A7441' },
  { name: 'Forest Green', hex: '#144F2F' },
  { name: 'Pastel Blue', hex: '#D6F6F3' },
  { name: 'Light Blue', hex: '#6082AF' },
  { name: 'Electric Blue', hex: '#03BACF' },
  { name: 'Royal', hex: '#175298' },
  { name: 'Navy', hex: '#1F2A40' },
  { name: 'Purple', hex: '#453B6D' },
  { name: 'Sand', hex: '#C6BFA5' },
  { name: 'Melon', hex: '#ECD0A0' },
  { name: 'Texas Orange', hex: '#79301C' },
  { name: 'Salmon', hex: '#FBC3AF' },
  { name: 'Light Lime', hex: '#BCE1B2' },
  { name: 'Safety Green', hex: '#7BDA5C' },
  { name: 'Sky Blue', hex: '#A4D3F0' },
  { name: 'Brown', hex: '#4A2500' },
]

const SPORTTEK_ST350: Swatch[] = [
  { name: 'White', hex: '#EDF2F8' },
  { name: 'Silver', hex: '#BDC2BC' },
  { name: 'Grey Concrete', hex: '#797F7D' },
  { name: 'Grey Concrete Heather', hex: '#5B6662' },
  { name: 'Iron Grey', hex: '#4D4E50' },
  { name: 'Iron Grey Heather', hex: '#494D50' },
  { name: 'Black', hex: '#262827' },
  { name: 'Neon Yellow', hex: '#EAFB0A' },
  { name: 'Vegas Gold', hex: '#D3CA9F' },
  { name: 'Sand', hex: '#CBBFA5' },
  { name: 'Gold', hex: '#FAB731' },
  { name: 'Neon Orange', hex: '#F36A22' },
  { name: 'Texas Orange', hex: '#AD582F' },
  { name: 'Deep Orange', hex: '#D05631' },
  { name: 'Cardinal', hex: '#5D242A' },
  { name: 'True Red', hex: '#B31C2F' },
  { name: 'Deep Red', hex: '#8D192C' },
  { name: 'Maroon', hex: '#5C323C' },
  { name: 'Neon Pink', hex: '#F65394' },
  { name: 'Purple', hex: '#554282' },
  { name: 'True Navy', hex: '#293042' },
  { name: 'True Navy Heather', hex: '#323B4A' },
  { name: 'True Royal', hex: '#215496' },
  { name: 'True Royal Heather', hex: '#2A4F79' },
  { name: 'Carolina Blue', hex: '#72A5D0' },
  { name: 'Atomic Blue', hex: '#109BB7' },
  { name: 'Tropic Blue', hex: '#189FAB' },
  { name: 'Kelly Green', hex: '#19895B' },
  { name: 'True Kelly Green', hex: '#108244' },
  { name: 'Forest Green', hex: '#2B4633' },
  { name: 'Lime Shock', hex: '#BDDF55' },
  { name: 'Olive Drab Green', hex: '#5B5D47' },
  { name: 'Coyote Brown', hex: '#867A60' },
  { name: 'Woodland Brown', hex: '#847058' },
]

const GILDAN_5000: Swatch[] = [
  { name: 'White', hex: '#F0F0F0' },
  { name: 'Off White', hex: '#EDE9D6' },
  { name: 'Ash Grey', hex: '#E9EAEB' },
  { name: 'Ice Grey', hex: '#CCCCC7' },
  { name: 'Gravel', hex: '#959B9B' },
  { name: 'Graphite Heather', hex: '#757774' },
  { name: 'Sport Grey', hex: '#B5B3B4' },
  { name: 'Tweed', hex: '#3D4547' },
  { name: 'Charcoal', hex: '#656766' },
  { name: 'Dark Heather', hex: '#495A61' },
  { name: 'Black', hex: '#131313' },
  { name: 'Cornsilk', hex: '#FDF699' },
  { name: 'Yellow Haze', hex: '#FBD799' },
  { name: 'Daisy', hex: '#FCD450' },
  { name: 'Old Gold', hex: '#DAA36C' },
  { name: 'Gold', hex: '#FAA32D' },
  { name: 'Tangerine', hex: '#FFA382' },
  { name: 'Antique Orange', hex: '#CA4326' },
  { name: 'Safety Orange', hex: '#F47935' },
  { name: 'Orange', hex: '#F16740' },
  { name: 'Sunset', hex: '#DB694E' },
  { name: 'Tennessee Orange', hex: '#F59640' },
  { name: 'Texas Orange', hex: '#B0581E' },
  { name: 'Light Pink', hex: '#F5CCD4' },
  { name: 'Dusty Rose', hex: '#F0C3AD' },
  { name: 'Coral Silk', hex: '#F2808A' },
  { name: 'Azalea', hex: '#E983B2' },
  { name: 'Safety Pink', hex: '#FA8DB4' },
  { name: 'Heather Radiant Orchid', hex: '#C67CB0' },
  { name: 'Heliconia', hex: '#E4407F' },
  { name: 'Berry', hex: '#920D6C' },
  { name: 'Heather Red', hex: '#FA556D' },
  { name: 'Antique Cherry Red', hex: '#880622' },
  { name: 'Cardinal Red', hex: '#9E1142' },
  { name: 'Maroon', hex: '#4B0B2D' },
  { name: 'Red', hex: '#CF1139' },
  { name: 'Garnet', hex: '#741032' },
  { name: 'Mint Green', hex: '#A6D4B7' },
  { name: 'Lime', hex: '#8EC96A' },
  { name: 'Neon Green', hex: '#6DB343' },
  { name: 'Electric Green', hex: '#4FB649' },
  { name: 'Kiwi', hex: '#A4C67A' },
  { name: 'Safety Green', hex: '#E2E558' },
  { name: 'Military Green', hex: '#556248' },
  { name: 'Antique Irish Green', hex: '#009C52' },
  { name: 'Heather Military Green', hex: '#767E73' },
  { name: 'Jade Dome', hex: '#007176' },
  { name: 'Turf Green', hex: '#197E3F' },
  { name: 'Antique Jade Dome', hex: '#009697' },
  { name: 'Fan Dark Green', hex: '#31493B' },
  { name: 'Irish Green', hex: '#00A350' },
  { name: 'Forest Green', hex: '#083619' },
  { name: 'Fan Marine Green', hex: '#0D484C' },
  { name: 'Light Blue', hex: '#9ECDE5' },
  { name: 'Sky', hex: '#83D0E4' },
  { name: 'Carolina Blue', hex: '#70A4D3' },
  { name: 'Aquatic', hex: '#76B0A2' },
  { name: 'Heather Sapphire', hex: '#1896E1' },
  { name: 'Iris', hex: '#447CAD' },
  { name: 'Antique Sapphire', hex: '#007FA4' },
  { name: 'Tropical Blue', hex: '#00B2C2' },
  { name: 'Sapphire', hex: '#009CC7' },
  { name: 'Midnight', hex: '#004D58' },
  { name: 'Indigo Blue', hex: '#3D627C' },
  { name: 'Neon Blue', hex: '#3E50A2' },
  { name: 'Blue Dusk', hex: '#344755' },
  { name: 'Royal', hex: '#0669AC' },
  { name: 'Fan Deep Royal', hex: '#203B72' },
  { name: 'Heather Navy', hex: '#415169' },
  { name: 'Navy', hex: '#00153A' },
  { name: 'Violet', hex: '#8798C4' },
  { name: 'Cobalt', hex: '#393B72' },
  { name: 'Lilac', hex: '#442E6D' },
  { name: 'Purple', hex: '#55247F' },
  { name: 'Blackberry', hex: '#1E163B' },
  { name: 'Fan Dark Purple', hex: '#2B2352' },
  { name: 'Sand', hex: '#D7C7AE' },
  { name: 'Brown Savana', hex: '#837A6A' },
  { name: 'Dark Chocolate', hex: '#261406' },
  { name: 'Natural', hex: '#E7DFCC' },
  { name: 'Russet', hex: '#441F30' },
]

export const SHIRT_COLLECTIONS: ShirtCollection[] = [
  { id: 'a4', name: 'A4 moisture wicking', shirt: 'A4 N3142 Cooling Performance Tee', colors: A4_N3142 },
  { id: 'sporttek', name: 'Sport-Tek (Ninja)', shirt: 'Sport-Tek ST350 PosiCharge Competitor Tee, from Ninja Transfers',
    colors: SPORTTEK_ST350 },
  { id: 'gildan', name: 'Gildan heavy tee', shirt: 'Gildan 5000 Heavy Cotton Tee', colors: GILDAN_5000 },
  { id: 'basic', name: 'Basic', shirt: 'Common shirt colors', colors: SHIRT_COLORS },
]

export function shirtCollection(id: string | undefined): ShirtCollection {
  return SHIRT_COLLECTIONS.find((c) => c.id === id) ?? SHIRT_COLLECTIONS[0]
}

/** The shirt color's name, looking in the chosen collection first */
export function shirtColorName(hex: string, collectionId?: string): { name: string; collection: ShirtCollection } | undefined {
  const h = hex.toUpperCase()
  const first = shirtCollection(collectionId)
  for (const collection of [first, ...SHIRT_COLLECTIONS.filter((c) => c !== first)]) {
    const s = collection.colors.find((c) => c.hex.toUpperCase() === h)
    if (s) return { name: s.name, collection }
  }
  return undefined
}

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
