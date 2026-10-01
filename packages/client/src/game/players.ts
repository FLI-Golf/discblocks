export interface Player {
  id: string;
  name: string;
  team: string;
  teamLogo: string;
  avatar: string;
  /** Strokes relative to par for the round. */
  score: number;
}

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
    score: 1,
  },
  {
    id: 'kat',
    name: 'Kat Mertsch',
    team: 'Ace Makers',
    teamLogo: TEAM_LOGOS.aceMakers,
    avatar: AVATARS.kat,
    score: 0,
  },
  {
    id: 'chris',
    name: 'Chris Dickerson',
    team: 'Disc Dynasty',
    teamLogo: TEAM_LOGOS.discDynasty,
    avatar: AVATARS.chris,
    score: -1,
  },
  {
    id: 'paige',
    name: 'Paige Pierce',
    team: 'Disc Dynasty',
    teamLogo: TEAM_LOGOS.discDynasty,
    avatar: AVATARS.paige,
    score: -3,
  },
];

export function formatScore(score: number): string {
  if (score === 0) {
    return 'E';
  }
  return score > 0 ? `+${score}` : String(score);
}
