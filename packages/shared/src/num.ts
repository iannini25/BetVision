/**
 * Rounding helpers shared by the engine workers and the web services.
 * Centralizes the `Math.round(n * 10^d) / 10^d` that was reimplemented in
 * odds-sync, live-engine, model-tracker, the mock provider and matches.service —
 * one home for the math (Projeto Simples: zero duplicação).
 */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/** Odds and live probabilities are snapshotted at 2 decimals. */
export function round2(value: number): number {
  return roundTo(value, 2)
}

/** Brier scores and calibration metrics are reported at 3 decimals. */
export function round3(value: number): number {
  return roundTo(value, 3)
}
