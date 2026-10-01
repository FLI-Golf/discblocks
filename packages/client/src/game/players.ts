export interface GolferLook {
  jersey: number;
  /** Sleeves and trim. */
  accent: number;
  shorts: number;
  skin: number;
  hair: number;
  hairStyle: 'ponytail' | 'short' | 'cap';
  /** Height and bulk multiplier. */
  build: number;
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
const ACE_MAKERS_KIT = { jersey: 0xf2f4f8, accent: 0xe02b20, shorts: 0x1a1a1e };
const DISC_DYNASTY_KIT = { jersey: 0xd8232a, accent: 0x14141a, shorts: 0x14141a };

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
      skin: 0xf0c8a0,
      hair: 0xc9a227,
      hairStyle: 'cap',
      build: 1.04,
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
      hairStyle: 'ponytail',
      build: 0.93,
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
      hairStyle: 'short',
      build: 1.08,
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
