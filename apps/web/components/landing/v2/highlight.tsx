import type { ReactNode } from 'react'
import styles from './landing.module.css'

/**
 * The deliberate highlight system (not decorative gradient-text):
 * - GradientWord: product nouns (estatística, inteligência, valor) carry the brand gradient.
 * - EditorialWord: negated/emotional words (mágica, escuro, sorte) in editorial serif italic.
 * The two treatments are mapped to meaning, never applied at random.
 */
export function GradientWord({ children }: { children: ReactNode }) {
  return <span className={styles.gradientWord}>{children}</span>
}

export function EditorialWord({ children }: { children: ReactNode }) {
  return <span className={styles.editorialWord}>{children}</span>
}
