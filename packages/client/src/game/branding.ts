// Branding domain for the golfer UNIFORM.
//
// DOMAIN SEPARATION: branding (team identity / colors / logos) is separate
// from Golfer anatomy/appearance, Pose, and Action. The uniform is a visual
// surface that CONSUMES branding; the Golfer does not own team identity.
//
//   GOLFER  = body/anatomy/appearance (skin, hair, eyes)
//   TEAM    = identity/colors/logos
//   UNIFORM = visual surface that consumes branding
//   POSE    = body configuration (never stores branding)
//   ACTION  = sequence of poses (never stores branding)

// Semantic color slots the uniform exposes. A Team (or default) supplies the
// values; the uniform never hard-codes a team.
export interface BrandingColors {
  primaryColor: number;
  secondaryColor: number;
  accentColor: number;
}

// Semantic logo slots. Values are asset URLs/paths; empty/undefined = no logo
// (never a broken texture).
export interface BrandingLogos {
  primaryLogo?: string;
  secondaryLogo?: string;
}

export interface TeamBranding extends BrandingColors, BrandingLogos {}

// Neutral development/fallback branding for the Male Baseline when no Team is
// assigned. Generic and team-agnostic.
export const DEFAULT_BRANDING: TeamBranding = {
  primaryColor: 0xf2f4f8, // jersey body (light)
  secondaryColor: 0x1a1a1e, // shorts / dark panels
  accentColor: 0xe02b20, // collar / placket / trim
  primaryLogo: undefined,
  secondaryLogo: undefined,
};

// A Team is the minimal identity needed to brand a uniform. Matches the
// existing game/teams.ts shape (name + logo) plus optional color identity.
export interface Team {
  name: string;
  primaryColor?: number;
  secondaryColor?: number;
  accentColor?: number;
  primaryLogo?: string;
  secondaryLogo?: string;
}

// Resolve the effective branding for a golfer's uniform:
//   Default Branding, overridden by Team values where the Team supplies them.
// No `if (team)` scattered through mesh creation — one resolver.
export function resolveBranding(
  team?: Team | null,
  fallback: TeamBranding = DEFAULT_BRANDING
): TeamBranding {
  if (!team) return { ...fallback };
  return {
    primaryColor: team.primaryColor ?? fallback.primaryColor,
    secondaryColor: team.secondaryColor ?? fallback.secondaryColor,
    accentColor: team.accentColor ?? fallback.accentColor,
    primaryLogo: team.primaryLogo ?? fallback.primaryLogo,
    secondaryLogo: team.secondaryLogo ?? fallback.secondaryLogo,
  };
}
