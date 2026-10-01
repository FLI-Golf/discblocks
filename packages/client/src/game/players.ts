import {
  BODY_PROFILES,
  buildCharacterAppearance,
  type BodyProfileId,
  type CharacterAppearance,
  type HairStyle,
} from '@/rendering/Golfer';

export interface GolferLook {
  jersey: number;
  /** Sleeves and trim. */
  accent: number;
  shorts: number;
  skin: number;
  hair: number;
  hairStyle: HairStyle | 'short' | 'cap' | 'visor';
  /** Height and bulk multiplier. */
  build: number;
  appearance?: CharacterAppearance;
}

export interface Player {
  id: string;
  name: string;
  team: string;
  teamLogo: string;
  avatar: string;
  look: GolferLook;
  /** Strokes relative to par for the round. */
  score: number;
}

// Both crests are red/black/white, so the kits split on jersey base: Ace Makers
// play in white with red trim, Disc Dynasty in red with black.
const ACE_MAKERS_KIT = { jersey: 0xf2f4f8, accent: 0xe02b20, shorts: 0x1a1a1e, skin: 0xf0c8a0 };
const DISC_DYNASTY_KIT = { jersey: 0xd8232a, accent: 0x14141a, shorts: 0x14141a, skin: 0xd6a078 };

const AVATARS = {
  simon:
    'https://pocketbase-production-e678.up.railway.app/api/files/pbc_1662676954/6bbgf2xwu7rfmva/male_placeholder_c4gj0tjzto.svg',
  kat: 'https://pocketbase-production-e678.up.railway.app/api/files/pbc_1662676954/s0xxrgxkjan14mu/female_placeholder_v2kq7pih55.svg',
  chris:
    'https://pocketbase-production-e678.up.railway.app/api/files/pbc_1662676954/pcrkyjt2dzi494p/male_placeholder_cg7peyv7xz.svg',
  paige:
    'https://pocketbase-production-e678.up.railway.app/api/files/pbc_1662676954/6fa47lqyaigr9zn/female_placeholder_1pz56e3277.svg',
};

const TEAM_LOGOS = {
  aceMakers: '/team_logos/ace_makers_mini_logo_01_g5k7hn184e.jpg',
  discDynasty: '/team_logos/disc_dynasty_mini_01_2heq2mflds.jpg',
};

function createPlayerAppearance(config: {
  bodyProfile: BodyProfileId;
  hairStyle: HairStyle;
  hairColor: number;
  skinTone: number;
  shirtColor: number;
  shortsColor: number;
  accentColor: number;
  build: number;
  beard?: number;
  stubble?: number;
  outfit?: Partial<CharacterAppearance['outfit']>;
  face?: Partial<CharacterAppearance['face']>;
}): CharacterAppearance {
  return buildCharacterAppearance({
    bodyProfile: config.bodyProfile,
    profile: BODY_PROFILES[config.bodyProfile],
    hairStyle: config.hairStyle,
    hairColor: config.hairColor,
    skinTone: config.skinTone,
    shirtColor: config.shirtColor,
    shortsColor: config.shortsColor,
    shoeColor: 0x111114,
    accentColor: config.accentColor,
    beard: config.beard ?? 0,
    stubble: config.stubble ?? 0,
    outfit: {
      sleeveLength: 1,
      collarHeight: 1,
      shirtFit: 1,
      shortsLength: 1,
      pantsFit: 0.9,
      ...config.outfit,
    },
    face: {
      brow: 0.5,
      nose: 0.5,
      eyeSpacing: 0.5,
      mouth: 0.5,
      beard: config.beard ?? 0,
      stubble: config.stubble ?? 0,
      ...config.face,
    },
  });
}

/** Playing order for the card, best score throwing last. */
export const GROUP: Player[] = [
  {
    id: 'simon',
    name: 'Simon Lizotte',
    team: 'Ace Makers',
    teamLogo: TEAM_LOGOS.aceMakers,
    avatar: AVATARS.simon,
    look: {
      ...ACE_MAKERS_KIT,
      skin: ACE_MAKERS_KIT.skin,
      hair: 0xc9a227,
      hairStyle: 'sidePart',
      build: 1.04,
      appearance: createPlayerAppearance({
        bodyProfile: 'athleticMale',
        hairStyle: 'sidePart',
        hairColor: 0xc9a227,
        skinTone: ACE_MAKERS_KIT.skin,
        shirtColor: ACE_MAKERS_KIT.jersey,
        shortsColor: ACE_MAKERS_KIT.shorts,
        accentColor: ACE_MAKERS_KIT.accent,
        build: 1.04,
        face: { brow: 0.82, nose: 0.42, eyeSpacing: 0.34, mouth: 0.68 },
      }),
    },
    score: 1,
  },
  {
    id: 'kat',
    name: 'Kat Mertsch',
    team: 'Ace Makers',
    teamLogo: TEAM_LOGOS.aceMakers,
    avatar: AVATARS.kat,
    look: {
      ...ACE_MAKERS_KIT,
      skin: 0xeec19a,
      hair: 0x6b4a2f,
      hairStyle: 'bun',
      build: 0.93,
      appearance: createPlayerAppearance({
        bodyProfile: 'athleticFemale',
        hairStyle: 'bun',
        hairColor: 0x6b4a2f,
        skinTone: 0xeec19a,
        shirtColor: ACE_MAKERS_KIT.jersey,
        shortsColor: ACE_MAKERS_KIT.shorts,
        accentColor: ACE_MAKERS_KIT.accent,
        build: 0.93,
        face: { brow: 0.28, nose: 0.72, eyeSpacing: 0.8, mouth: 0.36 },
      }),
    },
    score: 0,
  },
  {
    id: 'chris',
    name: 'Chris Dickerson',
    team: 'Disc Dynasty',
    teamLogo: TEAM_LOGOS.discDynasty,
    avatar: AVATARS.chris,
    look: {
      ...DISC_DYNASTY_KIT,
      skin: 0x7a4f31,
      hair: 0x1b1310,
      hairStyle: 'buzzCut',
      build: 1.08,
      appearance: createPlayerAppearance({
        bodyProfile: 'athleticMale',
        hairStyle: 'buzzCut',
        hairColor: 0x1b1310,
        skinTone: 0x7a4f31,
        shirtColor: DISC_DYNASTY_KIT.jersey,
        shortsColor: DISC_DYNASTY_KIT.shorts,
        accentColor: DISC_DYNASTY_KIT.accent,
        build: 1.08,
        beard: 0.36,
        face: { brow: 0.86, nose: 0.37, eyeSpacing: 0.3, mouth: 0.4 },
      }),
    },
    score: -1,
  },
  {
    id: 'paige',
    name: 'Paige Pierce',
    team: 'Disc Dynasty',
    teamLogo: TEAM_LOGOS.discDynasty,
    avatar: AVATARS.paige,
    look: {
      ...DISC_DYNASTY_KIT,
      skin: 0xd9a877,
      hair: 0x8a6236,
      hairStyle: 'ponytail',
      build: 0.96,
      appearance: createPlayerAppearance({
        bodyProfile: 'athleticFemale',
        hairStyle: 'ponytail',
        hairColor: 0x8a6236,
        skinTone: 0xd9a877,
        shirtColor: DISC_DYNASTY_KIT.jersey,
        shortsColor: DISC_DYNASTY_KIT.shorts,
        accentColor: DISC_DYNASTY_KIT.accent,
        build: 0.96,
        face: { brow: 0.4, nose: 0.74, eyeSpacing: 0.84, mouth: 0.44 },
      }),
    },
    score: -3,
  },
];

export function formatScore(score: number): string {
  if (score === 0) {
    return 'E';
  }
  return score > 0 ? `+${score}` : String(score);
}
