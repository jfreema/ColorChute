import { deltaE } from './color'

export interface Swatch {
  name: string
  hex: string
}

/**
 * Epic Sports' 40-color print wheel: the ink colors designs can use. Names and hex values are read straight off the
 * wheel Epic sent (Nov 13, 2026), in its order, clockwise from Black.
 */
export const EPIC_COLORS: Swatch[] = [
  { name: 'Black', hex: '#000000' },
  { name: 'Charcoal', hex: '#53565A' },
  { name: 'Pewter', hex: '#A5A5A5' },
  { name: 'Silver', hex: '#CCCCCC' },
  { name: 'Vintage', hex: '#FFFDD0' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Red', hex: '#AF0011' },
  { name: 'Cardinal', hex: '#751327' },
  { name: 'Maroon', hex: '#582D40' },
  { name: 'Dusty Rose', hex: '#B66C6D' },
  { name: 'Neon Pink', hex: '#EC008C' },
  { name: 'Pink', hex: '#F7AEC3' },
  { name: 'Pale Pink', hex: '#F0C8D1' },
  { name: 'Lavender', hex: '#C1A7E2' },
  { name: 'Electric Purple', hex: '#BB29BB' },
  { name: 'Purple', hex: '#8031A7' },
  { name: 'Royal Purple', hex: '#330072' },
  { name: 'Navy', hex: '#0A2041' },
  { name: 'Royal Blue', hex: '#0047BB' },
  { name: 'Slate Blue', hex: '#07487B' },
  { name: 'Electric Blue', hex: '#00AEEF' },
  { name: 'Shark Teal', hex: '#02AAA9' },
  { name: 'Dark Teal', hex: '#006269' },
  { name: 'Columbia', hex: '#A7C6ED' },
  { name: 'Mint', hex: '#BDE9C9' },
  { name: 'Lime', hex: '#A9EE8A' },
  { name: 'Kelly', hex: '#009A44' },
  { name: 'Military Green', hex: '#67823A' },
  { name: 'Forest', hex: '#335525' },
  { name: 'Dark Green', hex: '#115740' },
  { name: 'Orange', hex: '#FA4616' },
  { name: 'Texas Orange', hex: '#9E652E' },
  { name: 'Creamsicle', hex: '#FFA06A' },
  { name: 'Butter', hex: '#F8E08E' },
  { name: 'Maize', hex: '#FFD100' },
  { name: 'Neon Yellow', hex: '#E0E721' },
  { name: 'Gold', hex: '#FFA300' },
  { name: 'Vegas Gold', hex: '#CEB888' },
  { name: 'Linen', hex: '#E6DABF' },
  { name: 'Brown', hex: '#623B2A' },
]

/**
 * Common screen print ink colors, from the stock colors print shops usually carry. Hex values are the usual screen
 * versions of the Pantone color each one is matched to, noted beside it.
 */
export const COMMON_INKS: Swatch[] = [
  { name: 'Black', hex: '#000000' },
  { name: 'Charcoal', hex: '#333F48' }, // 432 C
  { name: 'Gray', hex: '#888B8D' }, // Cool Gray 8 C
  { name: 'Light Gray', hex: '#C8C9C7' }, // Cool Gray 3 C
  { name: 'Cream', hex: '#F1E6B2' }, // 7499 C
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Scarlet', hex: '#E4002B' }, // 185 C
  { name: 'Red', hex: '#C8102E' }, // 186 C
  { name: 'Cardinal', hex: '#9D2235' }, // 201 C
  { name: 'Maroon', hex: '#862633' }, // 202 C
  { name: 'Burgundy', hex: '#651D32' }, // 7421 C
  { name: 'Coral', hex: '#FF585D' }, // 178 C
  { name: 'Pink', hex: '#F8A3BC' }, // 189 C
  { name: 'Hot Pink', hex: '#E10098' }, // Rhodamine Red C
  { name: 'Lavender', hex: '#C1A7E2' }, // 264 C
  { name: 'Purple', hex: '#582C83' }, // 268 C
  { name: 'Navy', hex: '#041E42' }, // 282 C
  { name: 'Royal Blue', hex: '#0033A0' }, // 286 C
  { name: 'Sky Blue', hex: '#00A3E0' }, // 299 C
  { name: 'Columbia Blue', hex: '#8BB8E8' }, // 278 C
  { name: 'Turquoise', hex: '#00A9CE' }, // 312 C
  { name: 'Teal', hex: '#00737A' }, // 322 C
  { name: 'Mint', hex: '#6ECEB2' }, // 338 C
  { name: 'Lime', hex: '#97D700' }, // 375 C
  { name: 'Kelly Green', hex: '#009A44' }, // 347 C
  { name: 'Forest Green', hex: '#154734' }, // 3435 C
  { name: 'Olive', hex: '#5B6236' },
  { name: 'Orange', hex: '#FF6720' }, // 165 C
  { name: 'Texas Orange', hex: '#CB6015' }, // 159 C
  { name: 'Burnt Orange', hex: '#A9431E' }, // 1675 C
  { name: 'Athletic Gold', hex: '#FFB81C' }, // 1235 C
  { name: 'Yellow', hex: '#FFCD00' }, // 116 C
  { name: 'Lemon Yellow', hex: '#FCE300' }, // 102 C
  { name: 'Maize', hex: '#F1C400' }, // 7406 C
  { name: 'Old Gold', hex: '#B58500' }, // 125 C
  { name: 'Vegas Gold', hex: '#B9975B' }, // 465 C
  { name: 'Tan', hex: '#A89968' }, // 7503 C
  { name: 'Brown', hex: '#4E3629' }, // 476 C
  { name: 'Neon Yellow', hex: '#FFE600' }, // 803 C
  { name: 'Neon Green', hex: '#44D62C' }, // 802 C
  { name: 'Neon Orange', hex: '#FFAA4D' }, // 804 C
  { name: 'Neon Pink', hex: '#FF3EB5' }, // 806 C
]

/**
 * Ninja Transfers' screen print ink colors, from the Ink Color choices and swatches on their 3D Puff Transfers page
 * (ninjatransfers.com/products/3d-puff-transfers, Nov 14, 2026). Their DTF transfers print any color.
 */
export const NINJA_INKS: Swatch[] = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#000000' },
  { name: 'Red', hex: '#890C19' },
  { name: 'Orange', hex: '#CD3912' },
  { name: 'Gold', hex: '#EC9000' },
  { name: 'Yellow', hex: '#F2C105' },
  { name: 'Green', hex: '#477F06' },
  { name: 'Sea Glass', hex: '#498A78' },
  { name: 'Mint', hex: '#85E8C4' },
  { name: 'Blue', hex: '#0D547E' },
  { name: 'Sky Blue', hex: '#119BBA' },
  { name: 'Denim', hex: '#1F5A78' },
  { name: 'Purple', hex: '#412D61' },
  { name: 'Lavender', hex: '#9567AF' },
  { name: 'Pink', hex: '#CC2159' },
  { name: 'Bubble Gum', hex: '#FD637E' },
  { name: 'Coral', hex: '#F3A263' },
  { name: 'Tan', hex: '#B18F56' },
]

export interface InkCollection {
  id: string
  name: string
  /** Where the colors come from, shown under the swatches */
  about: string
  colors: Swatch[]
}

/** Print color groups for the fill color palette. Epic Sports is first because Epic prints the shirts. */
export const INK_COLLECTIONS: InkCollection[] = [
  { id: 'epic', name: 'Epic Sports', about: 'The 40 colors Epic prints', colors: EPIC_COLORS },
  { id: 'common', name: 'Common colors', about: 'Stock ink colors most print shops carry', colors: COMMON_INKS },
  { id: 'ninja', name: 'Ninja Transfers', about: 'Ninja’s screen print ink colors', colors: NINJA_INKS },
]

export function inkCollection(id: string | undefined): InkCollection {
  return INK_COLLECTIONS.find((c) => c.id === id) ?? INK_COLLECTIONS[0]
}

/** A print color's name, looking in the chosen group first */
export function inkColorName(hex: string, collectionId?: string): { name: string; collection: InkCollection } | undefined {
  const first = inkCollection(collectionId)
  for (const collection of [first, ...INK_COLLECTIONS.filter((c) => c !== first)]) {
    const s = collection.colors.find((c) => deltaE(c.hex, hex) < EPIC_MATCH)
    if (s) return { name: s.name, collection }
  }
  return undefined
}

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
  /** Groups one shirt's shared, adult-only, youth-only and extra color lists in the picker */
  family?: string
  colors: Swatch[]
}

/*
 * Hex values were read from each color's product photo (Nov 2026), so they are close to the real fabric but not exact.
 * Heathers show as their average color.
 * A4 and Sport-Tek colors come from what Ninja Print on Demand sells for each adult and youth style (Nov 15, 2026),
 * split the way Jared asked: colors sold in both adult and youth, then adult-only and youth-only outliers. A4 adds
 * the colors only Epic Sports lists. A4 hexes come from Jiffy's photos, except Athletic Orange, which Ninja's photos
 * show deeper than Jiffy's. ST420 White is lifted a little because its photo's shading makes it look gray.
 * Hot Coral and Pink Raspberry (youth ST350 only) come from Ninja's photos. Jerzees Dri-Power is split the same way,
 * with hexes from Ninja's adult photos (Birch from the youth photo; White lifted to look white).
 */
const EPIC_COOL: Swatch[] = [
  { name: 'White', hex: '#F4F4F4' },
  { name: 'Black', hex: '#262626' },
  { name: 'Silver', hex: '#B9B6A7' },
  { name: 'Charcoal', hex: '#636363' },
  { name: 'Scarlet', hex: '#CF092A' },
  { name: 'Maroon', hex: '#6B2549' },
  { name: 'Cardinal', hex: '#9E2A3D' },
  { name: 'Orange', hex: '#F35901' },
  { name: 'Safety Orange', hex: '#F87D06' },
  { name: 'Safety Yellow', hex: '#DEEF00' },
  { name: 'Gold', hex: '#E7931F' },
  { name: 'Vegas Gold', hex: '#AA9151' },
  { name: 'Lime', hex: '#9EEF0A' },
  { name: 'Kelly', hex: '#208B3D' },
  { name: 'Forest', hex: '#046132' },
  { name: 'Light Blue', hex: '#5489BF' },
  { name: 'Royal', hex: '#145DAA' },
  { name: 'Navy', hex: '#2D455F' },
  { name: 'Purple', hex: '#4B34A9' },
]

/** A4 colors Ninja POD sells in both adult (N3142) and youth (NB3142). Lime and Safety Orange are left out: they're
 * on Ninja's public page but missing from its product catalog (Jared, Nov 15, 2026). */
const A4_SHARED: Swatch[] = [
  { name: 'White', hex: '#F1F2F4' },
  { name: 'Silver', hex: '#B1B2AD' },
  { name: 'Graphite', hex: '#55595A' },
  { name: 'Black', hex: '#1B1D1C' },
  { name: 'Gold', hex: '#FEBD0D' },
  { name: 'Athletic Orange', hex: '#E74A0C' },
  { name: 'Scarlet', hex: '#BB2032' },
  { name: 'Maroon', hex: '#4B2937' },
  { name: 'Safety Yellow', hex: '#D4F800' },
  { name: 'Kelly Green', hex: '#2A7441' },
  { name: 'Forest Green', hex: '#144F2F' },
  { name: 'Light Blue', hex: '#6082AF' },
  { name: 'Electric Blue', hex: '#03BACF' },
  { name: 'Royal', hex: '#175298' },
  { name: 'Navy', hex: '#1F2A40' },
  { name: 'Purple', hex: '#453B6D' },
]

/** A4 colors Ninja POD sells only in adult */
const A4_ADULT_ONLY: Swatch[] = [
  { name: 'Pink', hex: '#EFA7BB' },
  { name: 'Coral', hex: '#FE415B' },
  { name: 'Cardinal', hex: '#682E3D' },
  { name: 'Pastel Mint', hex: '#BEECE2' },
  { name: 'Olive', hex: '#796E5C' },
  { name: 'Teal', hex: '#2B8094' },
  { name: 'Military Green', hex: '#3E3F1F' },
  { name: 'Pastel Blue', hex: '#D6F6F3' },
  { name: 'Sand', hex: '#C6BFA5' },
]

/** A4 N3142 colors on Epic Sports' list that Ninja POD doesn't sell */
const A4_EPIC_ONLY: Swatch[] = [
  { name: 'Light Yellow', hex: '#F8EFAC' },
  { name: 'Vegas Gold', hex: '#CEB280' },
  { name: 'Fuchsia', hex: '#C33C77' },
  { name: 'Melon', hex: '#ECD0A0' },
  { name: 'Texas Orange', hex: '#79301C' },
  { name: 'Burnt Orange', hex: '#7B301D' },
  { name: 'Salmon', hex: '#FBC3AF' },
  { name: 'Light Lime', hex: '#BCE1B2' },
  { name: 'Safety Green', hex: '#7BDA5C' },
  { name: 'Sky Blue', hex: '#A4D3F0' },
  { name: 'Brown', hex: '#4A2500' },
]

/** Sport-Tek colors Ninja POD sells in both adult ST350 and youth YST350 */
const SPORTTEK_ST350_SHARED: Swatch[] = [
  { name: 'White', hex: '#EDF2F8' },
  { name: 'Silver', hex: '#BDC2BC' },
  { name: 'Grey Concrete', hex: '#797F7D' },
  { name: 'Iron Grey', hex: '#4D4E50' },
  { name: 'Black', hex: '#262827' },
  { name: 'Neon Yellow', hex: '#EAFB0A' },
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
  { name: 'True Royal', hex: '#215496' },
  { name: 'Carolina Blue', hex: '#72A5D0' },
  { name: 'Atomic Blue', hex: '#109BB7' },
  { name: 'Tropic Blue', hex: '#189FAB' },
  { name: 'Kelly Green', hex: '#19895B' },
  { name: 'Forest Green', hex: '#2B4633' },
  { name: 'Lime Shock', hex: '#BDDF55' },
]

/** Sport-Tek ST350 colors Ninja POD sells only in adult */
const SPORTTEK_ST350_ADULT_ONLY: Swatch[] = [
  { name: 'Grey Concrete Heather', hex: '#5B6662' },
  { name: 'Iron Grey Heather', hex: '#494D50' },
  { name: 'Vegas Gold', hex: '#D3CA9F' },
  { name: 'Sand', hex: '#CBBFA5' },
  { name: 'True Navy Heather', hex: '#323B4A' },
  { name: 'True Royal Heather', hex: '#2A4F79' },
  { name: 'Olive Drab Green', hex: '#5B5D47' },
  { name: 'Coyote Brown', hex: '#867A60' },
  { name: 'Woodland Brown', hex: '#847058' },
]

/** Sport-Tek colors Ninja POD sells only in youth YST350 */
const SPORTTEK_ST350_YOUTH_ONLY: Swatch[] = [
  { name: 'Hot Coral', hex: '#F0536E' },
  { name: 'Pink Raspberry', hex: '#EB1169' },
]

/** Ninja POD sells the adult ST420 and youth YST420 in the same 15 colors */
const SPORTTEK_ST420: Swatch[] = [
  { name: 'White', hex: '#F0F0F0' },
  { name: 'Dark Smoke Grey', hex: '#616161' },
  { name: 'Black', hex: '#1A1A1A' },
  { name: 'Yellow', hex: '#EBD658' },
  { name: 'Soft Coral', hex: '#F8A590' },
  { name: 'True Red', hex: '#BC1F33' },
  { name: 'Cardinal', hex: '#641F33' },
  { name: 'Bright Seafoam', hex: '#8ED0B5' },
  { name: 'Kelly Green', hex: '#1E805A' },
  { name: 'Marine Green', hex: '#0F6D5D' },
  { name: 'Forest Green', hex: '#253A2F' },
  { name: 'Light Blue', hex: '#9EDCF9' },
  { name: 'Sapphire', hex: '#02B3DD' },
  { name: 'True Royal', hex: '#104D90' },
  { name: 'True Navy', hex: '#2F2F41' },
]

/** Jerzees Dri-Power colors Ninja POD sells in both adult 29M and youth 29B */
const JERZEES_29_SHARED: Swatch[] = [
  { name: 'White', hex: '#F0F0F2' },
  { name: 'Silver', hex: '#BBB4BB' },
  { name: 'Athletic Heather', hex: '#9BA1A5' },
  { name: 'Oxford', hex: '#A4A3A9' },
  { name: 'Charcoal Grey', hex: '#32373D' },
  { name: 'Black Heather', hex: '#36454C' },
  { name: 'Black', hex: '#192124' },
  { name: 'Cardinal', hex: '#A00429' },
  { name: 'Maroon', hex: '#581826' },
  { name: 'True Red', hex: '#D4263E' },
  { name: 'Vintage Heather Red', hex: '#C72648' },
  { name: 'Vintage Heather Maroon', hex: '#79394A' },
  { name: 'Neon Pink', hex: '#FF76A4' },
  { name: 'Cyber Pink', hex: '#FF3E95' },
  { name: 'Classic Pink', hex: '#FFD6DE' },
  { name: 'Deep Purple', hex: '#38275E' },
  { name: 'Violet', hex: '#5F63AC' },
  { name: 'Vintage Heather Blue', hex: '#224B7F' },
  { name: 'Vintage Heather Navy', hex: '#15334F' },
  { name: 'J. Navy', hex: '#1C2E51' },
  { name: 'Columbia Blue', hex: '#4C81C3' },
  { name: 'Light Blue', hex: '#648FB6' },
  { name: 'Royal', hex: '#01529C' },
  { name: 'Aquatic Blue', hex: '#01AACB' },
  { name: 'California Blue', hex: '#007FA0' },
  { name: 'Scuba Blue', hex: '#48CACC' },
  { name: 'Jade', hex: '#007F74' },
  { name: 'Cool Mint', hex: '#5ECDBD' },
  { name: 'Irish Green Heather', hex: '#1DB585' },
  { name: 'Kelly', hex: '#009563' },
  { name: 'Forest Green', hex: '#0C3C2E' },
  { name: 'Military Green', hex: '#3B4020' },
  { name: 'Neon Green', hex: '#99D55B' },
  { name: 'Kiwi', hex: '#70B84C' },
  { name: 'Safety Green', hex: '#DEE26A' },
  { name: 'Neon Yellow', hex: '#E5D73C' },
  { name: 'Gold', hex: '#FFA400' },
  { name: 'Island Yellow', hex: '#FFD462' },
  { name: 'Tennessee Orange', hex: '#FE6322' },
  { name: 'Safety Orange', hex: '#FF5C1C' },
  { name: 'Burnt Orange', hex: '#FF4E25' },
]

/** Jerzees Dri-Power colors Ninja POD sells only in adult 29M */
const JERZEES_29_ADULT_ONLY: Swatch[] = [
  { name: 'Ash', hex: '#D9D8DD' },
  { name: 'Khaki', hex: '#A98C6C' },
  { name: 'Chocolate', hex: '#3E1D0C' },
  { name: 'Crimson', hex: '#B3293B' },
  { name: 'Azalea', hex: '#FF87B5' },
  { name: 'Sandstone', hex: '#E1CBB6' },
  { name: 'Texas Orange', hex: '#A64224' },
]

/** Jerzees Dri-Power colors Ninja POD sells only in youth 29B */
const JERZEES_29_YOUTH_ONLY: Swatch[] = [
  { name: 'Birch', hex: '#E5E0E9' },
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

const A4 = 'A4 moisture wicking'
const ST350 = 'Sport-Tek ST350 PosiCharge (Ninja POD)'
const JERZEES = 'Jerzees Dri-Power 29M and 29B (Ninja POD)'

export const SHIRT_COLLECTIONS: ShirtCollection[] = [
  { id: 'epic', name: 'Epic Sports cool tee', shirt: 'Epic Cool Performance Dry-Fit Crew Tee, adult and youth, from Epic Sports',
    colors: EPIC_COOL },
  { id: 'a4', name: 'A4', family: A4, colors: A4_SHARED,
    shirt: 'A4 N3142 adult and NB3142 youth Cooling Performance Tee: the colors Ninja POD sells in both' },
  { id: 'a4-adult-only', name: 'A4 Adult only', family: A4, colors: A4_ADULT_ONLY,
    shirt: 'A4 N3142 Cooling Performance Tee: colors Ninja POD sells only in adult' },
  { id: 'a4-epic-only', name: 'A4 Epic-only colors', family: A4, colors: A4_EPIC_ONLY,
    shirt: "A4 N3142 Cooling Performance Tee: colors on Epic Sports' list that Ninja POD doesn't sell" },
  { id: 'sporttek', name: 'Sport-Tek ST350', family: ST350, colors: SPORTTEK_ST350_SHARED,
    shirt: 'Sport-Tek ST350 adult and YST350 youth PosiCharge Competitor Tee: the colors Ninja POD sells in both' },
  { id: 'st350-adult-only', name: 'ST350 Adult only', family: ST350, colors: SPORTTEK_ST350_ADULT_ONLY,
    shirt: 'Sport-Tek ST350 PosiCharge Competitor Tee: colors Ninja POD sells only in adult' },
  { id: 'st350-youth-only', name: 'ST350 Youth only', family: ST350, colors: SPORTTEK_ST350_YOUTH_ONLY,
    shirt: 'Sport-Tek YST350 PosiCharge Competitor Tee: colors Ninja POD sells only in youth' },
  { id: 'st420', name: 'Sport-Tek ST420', colors: SPORTTEK_ST420,
    shirt: 'Sport-Tek ST420 adult and YST420 youth Posi-UV Pro Tee, from Ninja POD (both come in the same colors)' },
  { id: 'jerzees', name: 'Jerzees Dri-Power', family: JERZEES, colors: JERZEES_29_SHARED,
    shirt: 'Jerzees Dri-Power 29M adult and 29B youth Active Tee: the colors Ninja POD sells in both' },
  { id: 'jerzees-adult-only', name: 'Jerzees Adult only', family: JERZEES, colors: JERZEES_29_ADULT_ONLY,
    shirt: 'Jerzees Dri-Power 29M Active Tee: colors Ninja POD sells only in adult' },
  { id: 'jerzees-youth-only', name: 'Jerzees Youth only', family: JERZEES, colors: JERZEES_29_YOUTH_ONLY,
    shirt: 'Jerzees Dri-Power 29B Active Tee: colors Ninja POD sells only in youth' },
  { id: 'gildan', name: 'Gildan heavy tee', shirt: 'Gildan 5000 Heavy Cotton Tee', colors: GILDAN_5000 },
  { id: 'basic', name: 'Basic', shirt: 'Common shirt colors', colors: SHIRT_COLORS },
]

/** The picker's entries: single collections, and each shirt's lists under one heading */
export function shirtCollectionGroups(): { family?: string; collections: ShirtCollection[] }[] {
  const groups: { family?: string; collections: ShirtCollection[] }[] = []
  for (const c of SHIRT_COLLECTIONS) {
    const last = groups[groups.length - 1]
    if (c.family && last?.family === c.family) last.collections.push(c)
    else groups.push({ family: c.family, collections: [c] })
  }
  return groups
}

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

/** The Epic print color closest to this one, and how far off it is (CIE76 ΔE; under about 3 looks the same) */
export function nearestEpicColor(hex: string): { swatch: Swatch; distance: number } {
  let best = { swatch: EPIC_COLORS[0], distance: Infinity }
  for (const swatch of EPIC_COLORS) {
    const distance = deltaE(hex, swatch.hex)
    if (distance < best.distance) best = { swatch, distance }
  }
  return best
}

/** Epic's name for an ink that is (or is nearly) one of its print colors */
export function epicColorName(hex: string): string | undefined {
  const n = nearestEpicColor(hex)
  return n.distance < EPIC_MATCH ? n.swatch.name : undefined
}

/** Closer than this counts as the same print color (antialiasing and rounding move an ink a little) */
export const EPIC_MATCH = 3
