'use client'

import { useQuery } from '@tanstack/react-query'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch ${url}: ${res.status}`)
  return res.json()
}

export function useMatches() {
  return useQuery({
    queryKey: ['matches'],
    queryFn: () => fetchJson<{ matches: any[] }>('/api/matches'),
    select: (data) => data.matches,
  })
}

export function useMatch(id: number) {
  return useQuery({
    queryKey: ['match', id],
    queryFn: () => fetchJson<{ match: any }>(`/api/matches/${id}`),
    select: (data) => data.match,
    enabled: !!id,
  })
}

export function useMatchProbabilities(id: number) {
  return useQuery({
    queryKey: ['match-probs', id],
    queryFn: () => fetchJson<{ probabilities: any[] }>(`/api/matches/${id}/probabilities`),
    select: (data) => data.probabilities,
    enabled: !!id,
  })
}

export function useMatchOdds(id: number) {
  return useQuery({
    queryKey: ['match-odds', id],
    queryFn: () => fetchJson<{ odds: any[] }>(`/api/matches/${id}/odds`),
    select: (data) => data.odds,
    enabled: !!id,
  })
}

export function useMatchNews(id: number) {
  return useQuery({
    queryKey: ['match-news', id],
    queryFn: () => fetchJson<{ news: any[] }>(`/api/matches/${id}/news`),
    select: (data) => data.news,
    enabled: !!id,
  })
}

export function useValueRadar() {
  return useQuery({
    queryKey: ['value-radar'],
    queryFn: () => fetchJson<{ items: any[] }>('/api/value-radar'),
    select: (data) => data.items,
  })
}

export function useModelPerformance() {
  return useQuery({
    queryKey: ['model-performance'],
    queryFn: () => fetchJson<any>('/api/model/performance'),
  })
}

export function useExploreTeams() {
  return useQuery({
    queryKey: ['explore-teams'],
    queryFn: () => fetchJson<{ teams: any[] }>('/api/explore/teams'),
    select: (data) => data.teams,
  })
}

export function useExplorePlayers() {
  return useQuery({
    queryKey: ['explore-players'],
    queryFn: () => fetchJson<{ players: any[] }>('/api/explore/players'),
    select: (data) => data.players,
  })
}

export function useExploreReferees() {
  return useQuery({
    queryKey: ['explore-referees'],
    queryFn: () => fetchJson<{ referees: any[] }>('/api/explore/referees'),
    select: (data) => data.referees,
  })
}

export function useTeam(id: number) {
  return useQuery({
    queryKey: ['team', id],
    queryFn: () => fetchJson<{ team: any; players: any[] }>(`/api/teams/${id}`),
    enabled: !!id,
  })
}

export function usePlayer(id: number) {
  return useQuery({
    queryKey: ['player', id],
    queryFn: () => fetchJson<{ player: any; team: any }>(`/api/players/${id}`),
    enabled: !!id,
  })
}

export function useReferee(id: number) {
  return useQuery({
    queryKey: ['referee', id],
    queryFn: () => fetchJson<{ referee: any; matches: any[] }>(`/api/referees/${id}`),
    enabled: !!id,
  })
}
