import { camoTileUrl } from './camo'
import { deltaE } from './color'
import type { Garment } from './shirt'

export interface Swatch {
  name: string
  hex: string
  /** A patterned shirt's second color: the darker digital camo printed over `hex` (see camo.ts) */
  camo?: string
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

/** Soft pastel and Easter colors, picked for this app */
const PASTELS: Swatch[] = [
  { name: 'Baby Pink', hex: '#F9C5D5' },
  { name: 'Bubblegum', hex: '#FF9FC2' },
  { name: 'Coral Blush', hex: '#F8B4A6' },
  { name: 'Peach', hex: '#FFD1A9' },
  { name: 'Sherbet', hex: '#FFB98C' },
  { name: 'Butter Yellow', hex: '#FFF0A5' },
  { name: 'Chick Yellow', hex: '#FFE36E' },
  { name: 'Honeydew', hex: '#E8F7C8' },
  { name: 'Pistachio', hex: '#C6E59E' },
  { name: 'Easter Grass', hex: '#A8E39F' },
  { name: 'Mint', hex: '#B5EAD7' },
  { name: 'Robin’s Egg', hex: '#96D6D9' },
  { name: 'Baby Blue', hex: '#BDE0F7' },
  { name: 'Periwinkle', hex: '#B3BEF2' },
  { name: 'Lavender', hex: '#D9C6F2' },
  { name: 'Jelly Bean Purple', hex: '#B9A3E3' },
  { name: 'Lilac', hex: '#E3B5E5' },
  { name: 'Orchid', hex: '#D59AD6' },
  { name: 'Cream', hex: '#FFF6E0' },
]

/** 1980s neon, synthwave and vaporwave colors, picked for this app */
const EIGHTIES: Swatch[] = [
  { name: 'Vapor Pink', hex: '#FF71CE' },
  { name: 'Hot Magenta', hex: '#F72585' },
  { name: 'Neon Fuchsia', hex: '#FF00FF' },
  { name: 'Laser Red', hex: '#FF3864' },
  { name: 'Sunset Orange', hex: '#FF6B35' },
  { name: 'Neon Orange', hex: '#FF9F1C' },
  { name: 'Cyber Yellow', hex: '#FCEE0A' },
  { name: 'Vapor Yellow', hex: '#FFFB96' },
  { name: 'Neon Green', hex: '#39FF14' },
  { name: 'Vapor Mint', hex: '#05FFA1' },
  { name: 'Miami Teal', hex: '#00C2B2' },
  { name: 'Vapor Blue', hex: '#01CDFE' },
  { name: 'Electric Blue', hex: '#4361EE' },
  { name: 'Deep Indigo', hex: '#3A0CA3' },
  { name: 'Electric Purple', hex: '#7209B7' },
  { name: 'Vapor Purple', hex: '#B967FF' },
  { name: 'Chrome', hex: '#C0C0C8' },
  { name: 'Midnight Grid', hex: '#2B1055' },
  { name: 'Arcade Black', hex: '#0D0221' },
]

/** Earthy vintage 1970s colors, picked for this app */
const SEVENTIES: Swatch[] = [
  { name: 'Harvest Gold', hex: '#DA9100' },
  { name: 'Mustard', hex: '#E1AD01' },
  { name: 'Sunflower', hex: '#F8B12C' },
  { name: 'Tangerine', hex: '#F07C1F' },
  { name: 'Burnt Orange', hex: '#CC5500' },
  { name: 'Rust', hex: '#B7410E' },
  { name: 'Brick', hex: '#8E2A1A' },
  { name: 'Terracotta', hex: '#E2725B' },
  { name: 'Dusty Rose', hex: '#C08081' },
  { name: 'Eggplant', hex: '#614051' },
  { name: 'Avocado', hex: '#568203' },
  { name: 'Olive', hex: '#6B6B2A' },
  { name: 'Pea Green', hex: '#8E9A3A' },
  { name: 'Peacock Teal', hex: '#00787A' },
  { name: 'Turquoise', hex: '#30B5B0' },
  { name: 'Denim', hex: '#4F6D8F' },
  { name: 'Chocolate', hex: '#5C3A21' },
  { name: 'Copper', hex: '#B87333' },
  { name: 'Camel', hex: '#C19A6B' },
  { name: 'Cream', hex: '#F3E5AB' },
]

/**
 * MrBeast, Feastables and Prime colors (Nov 15, 2026). None of them publish brand values, so these are read from
 * their sites: MrBeast's from shopmrbeast.com's theme, Feastables' from feastables.com's theme and wrapper photos,
 * and Prime's from the bottle photos on drinkprime.com. MrBeast, Feastables wrappers and Prime's blue bottles share
 * one bright blue.
 */
const BEAST_PRIME: Swatch[] = [
  { name: 'Beast Blue', hex: '#00BCE7' },
  { name: 'Beast Pink', hex: '#E74683' },
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Feastables Chocolate', hex: '#492426' },
  { name: 'Feastables Cream', hex: '#F2EBE0' },
  { name: 'Feastables Pink', hex: '#FF2F9F' },
  { name: 'Feastables Purple', hex: '#67318F' },
  { name: 'Feastables Lime', hex: '#CDFC18' },
  { name: 'Peanut Butter Orange', hex: '#E56722' },
  { name: 'Caramel', hex: '#E9A438' },
  { name: 'Sour Strikes Green', hex: '#BFD351' },
  { name: 'Prime Red', hex: '#F3202F' },
  { name: 'Cherry Freeze', hex: '#E71948' },
  { name: 'Strawberry Watermelon', hex: '#E785AE' },
  { name: 'Orange Kream', hex: '#F19231' },
  { name: 'Summer Pop Yellow', hex: '#FEDE01' },
  { name: 'Lemon Lime', hex: '#8DC635' },
  { name: 'Glowberry Green', hex: '#49A342' },
]

/**
 * What the Custom group starts with, in the batches Jared asked for. A batch added later also reaches lists people
 * already changed, once (see customColorList.ts). Each color is the median of a well-lit patch of his photos.
 */
export const CUSTOM_STARTER_BATCHES: Swatch[][] = [
  // Nov 16, 2026: a marker sketch of a U-joint and a pastel cotton candy machine. The machine's periwinkle window was
  // dropped as too close to Marker Violet.
  [
    { name: 'Marker Yellow', hex: '#E5EA84' },
    { name: 'Marker Orange', hex: '#E88939' },
    { name: 'Marker Rose', hex: '#DE7790' },
    { name: 'Marker Magenta', hex: '#C8498C' },
    { name: 'Marker Orchid', hex: '#A645B2' },
    { name: 'Marker Violet', hex: '#977ACE' },
    { name: 'Marker Blue', hex: '#4DA3E3' },
    { name: 'Marker Mint', hex: '#A8E4D0' },
    { name: 'Marker Green', hex: '#93CE47' },
    { name: 'Marker Tan', hex: '#E0D0A3' },
    { name: 'Candy Pink', hex: '#E8AEBC' },
    { name: 'Candy Lilac', hex: '#EED9FC' },
    { name: 'Candy Blue', hex: '#7BB1C8' },
    { name: 'Candy Yellow', hex: '#F8DB62' },
    { name: 'Candy Gold', hex: '#D8A538' },
  ],
  // Nov 18, 2026: a seafoam swatch and a pair of batting gloves (sky blue and tan leather, navy laces, a royal blue
  // bolt). Glove Tan sits close to Marker Tan; Jared asked for both.
  [
    { name: 'Seafoam', hex: '#79C29F' },
    { name: 'Glove Sky Blue', hex: '#4CA9C2' },
    { name: 'Glove Tan', hex: '#E9D2B1' },
    { name: 'Glove Navy', hex: '#0B1B31' },
    { name: 'Glove Bolt Blue', hex: '#204C8F' },
  ],
]

export const CUSTOM_STARTERS: Swatch[] = CUSTOM_STARTER_BATCHES.flat()

export interface InkCollection {
  id: string
  name: string
  /** Where the colors come from, shown under the swatches */
  about: string
  colors: Swatch[]
  /** A themed palette rather than a print shop's inks, listed under Themes in the picker */
  theme?: boolean
  /** Each person's own list, saved to their account; `colors` is only what it starts with (see customColors.ts) */
  custom?: boolean
}

/**
 * Print color groups for the fill color palette. Epic Sports is first because Epic prints the shirts. The themed
 * palettes come last; the color's title still says whether Epic has it.
 */
export const INK_COLLECTIONS: InkCollection[] = [
  { id: 'epic', name: 'Epic Sports', about: 'The 40 colors Epic prints', colors: EPIC_COLORS },
  { id: 'common', name: 'Common colors', about: 'Stock ink colors most print shops carry', colors: COMMON_INKS },
  { id: 'ninja', name: 'Ninja Transfers', about: 'Ninja’s screen print ink colors', colors: NINJA_INKS },
  { id: 'custom', name: 'Custom', about: 'Your own colors, saved to your account. Mix one with +, then save it.', colors: CUSTOM_STARTERS, custom: true },
  { id: 'pastels', name: 'Pastels', about: 'Soft pastel and Easter colors', colors: PASTELS, theme: true },
  { id: '1980s', name: '1980s', about: '1980s neon, synthwave and vaporwave colors', colors: EIGHTIES, theme: true },
  { id: '1970s', name: '1970s', about: 'Earthy vintage 1970s colors', colors: SEVENTIES, theme: true },
  { id: 'beastprime', name: 'BeastPrime', colors: BEAST_PRIME, theme: true,
    about: 'MrBeast, Feastables and Prime colors, read from their sites' },
]

/** The print color groups with the Custom group holding this person's own colors */
export function withCustomColors(colors: Swatch[]): InkCollection[] {
  return INK_COLLECTIONS.map((c) => (c.custom ? { ...c, colors } : c))
}

export function inkCollection(id: string | undefined, collections = INK_COLLECTIONS): InkCollection {
  return collections.find((c) => c.id === id) ?? collections[0]
}

/** A print color's name, looking in the chosen group first */
export function inkColorName(
  hex: string, collectionId?: string, collections = INK_COLLECTIONS,
): { name: string; collection: InkCollection } | undefined {
  const first = inkCollection(collectionId, collections)
  for (const collection of [first, ...collections.filter((c) => c !== first)]) {
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
  /** What the mockup draws for this blank; a t-shirt when missing */
  garment?: Garment
  colors: Swatch[]
}

/*
 * Hex values were read from each color's product photo (Nov 2026), so they are close to the real fabric but not exact.
 * Heathers show as their average color.
 * A4 and Sport-Tek colors come from what Ninja Print on Demand sells for each adult and youth style (Nov 15, 2026),
 * split the way Jared asked: colors sold in both adult and youth, then adult-only and youth-only outliers. A4 adds
 * the colors only Epic Sports lists. A4 hexes come from Jiffy's photos, except Athletic Orange, which Ninja's photos
 * show deeper than Jiffy's. ST420 White is lifted a little because its photo's shading makes it look gray.
 * Hot Coral and Pink Raspberry (youth ST350 only) come from Ninja's photos. Jerzees Dri-Power and Gildan Ultra Cotton
 * are split the same way, following Jared's lists from Ninja's catalog, with hexes from Ninja's photos.
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

/**
 * Sport-Tek Digi Camo, adult ST460 and youth YST460: Ninja POD sells both in the same 7 colors. Each is a base color
 * with a darker digital camo printed over about half of it. Both tones were read off Ninja's ST460 photos (White's base
 * is lifted to look white). The base hex is the swatch's color and must not match any other shirt swatch, since the
 * preview finds the pattern by it.
 */
const SPORTTEK_ST460: Swatch[] = [
  { name: 'White', hex: '#ECECEB', camo: '#9E9E9E' },
  { name: 'Grey Concrete', hex: '#8D8C87', camo: '#5E5D58' },
  { name: 'Black', hex: '#383A34', camo: '#252722' },
  { name: 'True Red', hex: '#D70A27', camo: '#A10314' },
  { name: 'Olive Drab Green', hex: '#6E6E49', camo: '#4B4B2B' },
  { name: 'True Royal', hex: '#4269A8', camo: '#27497D' },
  { name: 'True Navy', hex: '#3B3D52', camo: '#212435' },
]

/** Jerzees Dri-Power colors Ninja POD sells in both adult 29M and youth 29B (Jared's list, from Ninja's catalog) */
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

/** Jerzees Dri-Power colors Ninja POD sells only in adult 29M (Jared's list) */
const JERZEES_29_ADULT_ONLY: Swatch[] = [
  { name: 'Ash', hex: '#D9D8DD' },
  { name: 'Khaki', hex: '#A98C6C' },
  { name: 'Sandstone', hex: '#E1CBB6' },
  { name: 'Chocolate', hex: '#3E1D0C' },
  { name: 'Crimson', hex: '#B3293B' },
  { name: 'Texas Orange', hex: '#A64224' },
]

/**
 * Adult 29M colors in Jared's Ninja catalog list that Ninja's public site doesn't show. Ninja has no photos of them,
 * so the hexes are Jerzees' own published values.
 */
const JERZEES_29_CATALOG_ONLY: Swatch[] = [
  { name: 'Sweet Cream Heather', hex: '#F3ECE6' },
  { name: 'Clay', hex: '#B2A8A2' },
  { name: 'Rock', hex: '#898A8D' },
  { name: 'Golden Pecan', hex: '#B77729' },
  { name: 'Retro Heather Royal', hex: '#385E9D' },
]

/** Jerzees Dri-Power colors Ninja POD sells only in youth 29B (Jared's list) */
const JERZEES_29_YOUTH_ONLY: Swatch[] = [
  { name: 'Irish Green Heather', hex: '#1DB585' },
  { name: 'Violet', hex: '#5F63AC' },
]

/** Gildan Ultra Cotton colors Ninja POD sells in both adult G200 and youth G200B (Jared's list) */
const GILDAN_G200_SHARED: Swatch[] = [
  { name: 'White', hex: '#F3F3F3' },
  { name: 'Ash', hex: '#E1E0E5' },
  { name: 'Sport Grey', hex: '#B3B2B0' },
  { name: 'Charcoal', hex: '#454543' },
  { name: 'Black', hex: '#181818' },
  { name: 'Red', hex: '#B81327' },
  { name: 'Cherry Red', hex: '#A1092D' },
  { name: 'Safety Pink', hex: '#FC6099' },
  { name: 'Heliconia', hex: '#E64682' },
  { name: 'Maroon', hex: '#470120' },
  { name: 'Light Pink', hex: '#FFD6EB' },
  { name: 'Purple', hex: '#351956' },
  { name: 'Navy', hex: '#1E2337' },
  { name: 'Light Blue', hex: '#BBD8F8' },
  { name: 'Carolina Blue', hex: '#6C9BCD' },
  { name: 'Royal', hex: '#0C5AAF' },
  { name: 'Sapphire', hex: '#017DBE' },
  { name: 'Jade Dome', hex: '#007F7C' },
  { name: 'Forest Green', hex: '#1D2D2A' },
  { name: 'Kelly Green', hex: '#009565' },
  { name: 'Irish Green', hex: '#00914C' },
  { name: 'Mint Green', hex: '#D2F9C3' },
  { name: 'Lime', hex: '#8FCC51' },
  { name: 'Safety Green', hex: '#E9FB02' },
  { name: 'Daisy', hex: '#F6E269' },
  { name: 'Gold', hex: '#F29F00' },
  { name: 'Safety Orange', hex: '#FF7E00' },
  { name: 'Orange', hex: '#DB5A1B' },
]

/**
 * Gildan Ultra Cotton colors Ninja POD sells only in adult G200 (Jared's list). Kiwi is on Ninja's public page but
 * not in Jared's list, so it is left out.
 */
const GILDAN_G200_ADULT_ONLY: Swatch[] = [
  { name: 'Ice Grey', hex: '#DEDAD7' },
  { name: 'Prairie Dust', hex: '#706756' },
  { name: 'Military Green', hex: '#485141' },
  { name: 'Dark Heather', hex: '#4E4E4C' },
  { name: 'Heather Navy', hex: '#3B3E51' },
  { name: 'Antique Cherry Red', hex: '#871B28' },
  { name: 'Heather Cardinal', hex: '#B24957' },
  { name: 'Cardinal Red', hex: '#7B0D27' },
  { name: 'Azalea', hex: '#F883B5' },
  { name: 'Orchid', hex: '#E5CAED' },
  { name: 'Metro Blue', hex: '#1C2448' },
  { name: 'Heather Indigo', hex: '#5A6A84' },
  { name: 'Antique Royal', hex: '#0E3478' },
  { name: 'Iris', hex: '#428DE3' },
  { name: 'Indigo Blue', hex: '#47576D' },
  { name: 'Blue Dusk', hex: '#1B2831' },
  { name: 'Stone Blue', hex: '#7B919F' },
  { name: 'Heather Sapphire', hex: '#31A1DF' },
  { name: 'Sky', hex: '#71C5E7' },
  { name: 'Galapagos Blue', hex: '#015668' },
  { name: 'Antique Irish Green', hex: '#018544' },
  { name: 'Pistachio', hex: '#D5D893' },
  { name: 'Natural', hex: '#EDEAD8' },
  { name: 'Cornsilk', hex: '#F8EF8E' },
  { name: 'Olive', hex: '#474133' },
  { name: 'Vegas Gold', hex: '#FDD99E' },
  { name: 'Tan', hex: '#C7AD7C' },
  { name: 'Sand', hex: '#DBCEBE' },
  { name: 'Dark Chocolate', hex: '#251B11' },
  { name: 'Tangerine', hex: '#FC923B' },
  { name: 'Texas Orange', hex: '#BB5729' },
]

/**
 * Adult G200 colors in Jared's Ninja catalog list that Ninja's public site doesn't show. PFD White has no photo, so
 * its hex is a guess.
 */
const GILDAN_G200_CATALOG_ONLY: Swatch[] = [
  { name: 'PFD White', hex: '#F2F1EC' },
]

/** Gildan DryBlend G125 hoodie, as Ninja POD sells it. Hexes read from the photos on its Ninja page (Nov 2026). */
const GILDAN_G125: Swatch[] = [
  { name: 'White', hex: '#F3F3F5' },
  { name: 'Ash', hex: '#E5E5E7' },
  { name: 'Sport Grey', hex: '#BFBFBF' },
  { name: 'Charcoal', hex: '#464644' },
  { name: 'Black', hex: '#252525' },
  { name: 'Red', hex: '#B51529' },
  { name: 'Maroon', hex: '#480220' },
  { name: 'Navy', hex: '#1D2339' },
  { name: 'Royal', hex: '#1661B5' },
  { name: 'Forest Green', hex: '#223030' },
  { name: 'Safety Green', hex: '#E3F409' },
  { name: 'Safety Orange', hex: '#FE8002' },
]

/** Gildan Heavy Blend G180 crewneck sweatshirt, as Ninja POD sells it. Hexes read from its Ninja photos (Nov 2026). */
const GILDAN_G180: Swatch[] = [
  { name: 'White', hex: '#F7F7F7' },
  { name: 'Ash', hex: '#EAEAEA' },
  { name: 'Sport Grey', hex: '#B7B7B7' },
  { name: 'Graphite Heather', hex: '#787878' },
  { name: 'Dark Heather', hex: '#474C52' },
  { name: 'Charcoal', hex: '#494947' },
  { name: 'Black', hex: '#212121' },
  { name: 'Red', hex: '#BB182B' },
  { name: 'Cherry Red', hex: '#A20B2E' },
  { name: 'Heather Sport Scarlet Red', hex: '#C16670' },
  { name: 'Antique Cherry Red', hex: '#7F232E' },
  { name: 'Cardinal Red', hex: '#7E1029' },
  { name: 'Garnet', hex: '#611320' },
  { name: 'Maroon', hex: '#4D0626' },
  { name: 'Heather Sport Dark Maroon', hex: '#7D6166' },
  { name: 'Safety Pink', hex: '#FD689D' },
  { name: 'Heliconia', hex: '#E84682' },
  { name: 'Light Pink', hex: '#FBD5EA' },
  { name: 'Purple', hex: '#3D1F5D' },
  { name: 'Light Blue', hex: '#C1DDFC' },
  { name: 'Carolina Blue', hex: '#6D9DCE' },
  { name: 'Sapphire', hex: '#0383C4' },
  { name: 'Royal', hex: '#0E5CB1' },
  { name: 'Heather Sport Royal', hex: '#4660B3' },
  { name: 'Indigo Blue', hex: '#4C5C73' },
  { name: 'Heather Sport Dark Navy', hex: '#4D536D' },
  { name: 'Navy', hex: '#23283C' },
  { name: 'Irish Green', hex: '#039451' },
  { name: 'Heather Sport Dark Green', hex: '#5D726B' },
  { name: 'Military Green', hex: '#4E5746' },
  { name: 'Forest Green', hex: '#1E2E2B' },
  { name: 'Safety Green', hex: '#E6F807' },
  { name: 'Gold', hex: '#FDC407' },
  { name: 'Safety Orange', hex: '#FD7E08' },
  { name: 'Orange', hex: '#DC5A1C' },
  { name: 'Sand', hex: '#E2D5C5' },
  { name: 'Dark Chocolate', hex: '#2A2017' },
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
const GILDAN_UC = 'Gildan Ultra Cotton G200 and G200B (Ninja POD)'
const SWEATSHIRTS = 'Gildan sweatshirts (Ninja POD)'

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
  { id: 'st460', name: 'Sport-Tek Digi Camo', colors: SPORTTEK_ST460,
    shirt: 'Sport-Tek ST460 adult and YST460 youth Digi Camo Tee, from Ninja POD (both come in the same colors)' },
  { id: 'jerzees', name: 'Jerzees Dri-Power', family: JERZEES, colors: JERZEES_29_SHARED,
    shirt: 'Jerzees Dri-Power 29M adult and 29B youth Active Tee: the colors Ninja POD sells in both' },
  { id: 'jerzees-adult-only', name: 'Jerzees Adult only', family: JERZEES, colors: JERZEES_29_ADULT_ONLY,
    shirt: 'Jerzees Dri-Power 29M Active Tee: colors Ninja POD sells only in adult' },
  { id: 'jerzees-youth-only', name: 'Jerzees Youth only', family: JERZEES, colors: JERZEES_29_YOUTH_ONLY,
    shirt: 'Jerzees Dri-Power 29B Active Tee: colors Ninja POD sells only in youth' },
  { id: 'jerzees-catalog-only', name: 'Jerzees catalog only', family: JERZEES, colors: JERZEES_29_CATALOG_ONLY,
    shirt: "Jerzees Dri-Power 29M Active Tee: adult colors in Ninja POD's catalog that its public site doesn't show" },
  { id: 'gildan-uc', name: 'Gildan Ultra Cotton', family: GILDAN_UC, colors: GILDAN_G200_SHARED,
    shirt: 'Gildan Ultra Cotton G200 adult and G200B youth Tee: the colors Ninja POD sells in both' },
  { id: 'gildan-uc-adult-only', name: 'G200 Adult only', family: GILDAN_UC, colors: GILDAN_G200_ADULT_ONLY,
    shirt: 'Gildan Ultra Cotton G200 Tee: colors Ninja POD sells only in adult' },
  { id: 'gildan-uc-catalog-only', name: 'G200 catalog only', family: GILDAN_UC, colors: GILDAN_G200_CATALOG_ONLY,
    shirt: "Gildan Ultra Cotton G200 Tee: adult colors in Ninja POD's catalog that its public site doesn't show" },
  { id: 'gildan', name: 'Gildan heavy tee', shirt: 'Gildan 5000 Heavy Cotton Tee', colors: GILDAN_5000 },
  { id: 'g125', name: 'DryBlend Hoodie', family: SWEATSHIRTS, garment: 'hoodie', colors: GILDAN_G125,
    shirt: 'Gildan DryBlend G125 Hoodie, from Ninja POD' },
  { id: 'g180', name: 'Heavy Blend Crew', family: SWEATSHIRTS, garment: 'crew', colors: GILDAN_G180,
    shirt: 'Gildan Heavy Blend G180 Crewneck Sweatshirt, from Ninja POD' },
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

/** The darker camo color printed over this shirt color, if it is one of the patterned shirts */
export function shirtCamo(hex: string): string | undefined {
  const h = hex.toUpperCase()
  for (const collection of SHIRT_COLLECTIONS) {
    const s = collection.colors.find((c) => c.camo && c.hex.toUpperCase() === h)
    if (s) return s.camo
  }
  return undefined
}

/** A CSS background for a shirt color: flat, or the camo pattern with its tile `tile` px square */
export function shirtBackground(hex: string, tile = 256, at = '0 0'): string {
  const camo = shirtCamo(hex)
  return camo ? `url("${camoTileUrl(hex, camo)}") ${at} / ${tile}px ${tile}px repeat, ${hex}` : hex
}

/** A shirt swatch's background: camo shows big cells, from a spot of the tile that is about half dark */
export const shirtSwatchBackground = (hex: string) => shirtBackground(hex, 400, '-45px -50px')

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
