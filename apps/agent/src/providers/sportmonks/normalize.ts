// Pure helpers to reconcile Sportmonks entities with the internal schema.
// Real deployments start from a fresh DB (the seed skips sport data in sportmonks
// mode), so teams are created by externalId; in a MIXED DB this also reconciles the
// 12 seeded (Portuguese) teams to Sportmonks' (English) entries via code/alias.

export function normalizeName(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

// Sportmonks (English) name -> seed shortName, for the seeded Copa teams.
export const TEAM_ALIASES: Record<string, string> = {
  brazil: 'BRA', germany: 'ALE', argentina: 'ARG', france: 'FRA', england: 'ING',
  portugal: 'POR', morocco: 'MAR', norway: 'NOR', colombia: 'COL', serbia: 'SRB',
  mexico: 'MEX', 'south africa': 'RSA',
}

export type TeamLike = { id: number; externalId?: string | null; name: string; shortName: string }
export type SmTeamRef = { id: number; name: string; short_code?: string | null }

/** Match a Sportmonks team to an existing row: by externalId, then short_code, then alias/name. */
export function matchTeam(existing: TeamLike[], sm: SmTeamRef): TeamLike | undefined {
  const ext = String(sm.id)
  const byExt = existing.find((t) => t.externalId === ext)
  if (byExt) return byExt

  const code = (sm.short_code ?? '').toUpperCase()
  if (code) {
    const byCode = existing.find((t) => t.shortName.toUpperCase() === code)
    if (byCode) return byCode
  }

  const norm = normalizeName(sm.name)
  const alias = TEAM_ALIASES[norm]
  if (alias) {
    const byAlias = existing.find((t) => t.shortName === alias)
    if (byAlias) return byAlias
  }
  return existing.find((t) => normalizeName(t.name) === norm)
}

/** Short code for a Sportmonks team, falling back to the first letters of the name. */
export function shortCode(sm: SmTeamRef): string {
  const code = (sm.short_code ?? '').toUpperCase()
  if (code) return code.slice(0, 10)
  return sm.name.replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 3).toUpperCase() || 'TBD'
}
