export interface TeamResult {
  name: string;
  logo: string;
  score: number;
}

/** The two teams contesting this hole, shown on the stadium scoreboard. */
export const PLAYING_TEAMS: TeamResult[] = [
  { name: 'ACE MAKERS', logo: '/team_logos/ace_makers_logo_1senu6r6ys.png', score: 7 },
  { name: 'DISC DYNASTY', logo: '/team_logos/disc_dynasty_regular_kgg3frih96.png', score: 5 },
];

/** Everyone else in the league, shown on the results ticker. */
export const LEAGUE_RESULTS: TeamResult[] = [
  {
    name: 'CHAIN BREAKERS',
    logo: '/team_logos/chain_breakers_regular_01_4ticluji4m.jpg',
    score: 6,
  },
  { name: 'CHAIN SEEKERS', logo: '/team_logos/chain_seekers_mini_01_ebssfkymie.jpg', score: 4 },
  { name: 'DISK JESTERS', logo: '/team_logos/disk_jesters_mini_ll9ttpclk3.png', score: 9 },
  { name: 'FAIRWAY BOMBERS', logo: '/team_logos/fair_way_bombers_mini_8k4kmyawb1.png', score: 3 },
  { name: 'GLIDE MASTERS', logo: '/team_logos/glide_masters_miini_9jiee04jq3.png', score: 8 },
  { name: 'MIDAS TOUCH', logo: '/team_logos/midas_touch_mini_eqgncmsn7n.png', score: 5 },
];
