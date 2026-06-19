# CLAUDE.md — BetV

## Sobre
BetV — app de estatísticas de futebol ao vivo / radar de valor para apostas.
Fase atual: design. Referência visual: `BetV App.dc.html` · Logo: `BetV-logo.png`.

## Skills do projeto (IMPORTANTE)
As skills seguem UMA organização. Nunca deixe SKILL.md, zips ou pastas de skill soltos na raiz.

| Local | O que é |
|---|---|
| `.agents/skills/<nome>/` | Cópia canônica de todas as skills (convenção agentskills.io) |
| `.claude/skills/<nome>` | Symlink/junction → `.agents/skills/<nome>` (descoberta pelo Claude Code) |
| `.claude/skills/impeccable/` | Exceção: instalada direto pelo CLI dela (`npx impeccable`) |
| `skills-lock.json` | Gerenciado pelo CLI `npx skills` — SÓ rastreia skills vindas do GitHub |

### Adicionar nova skill
- **Do GitHub:** `npx skills add <owner/repo>` (atualiza o lock e cria o symlink sozinho).
- **Local/própria:** criar `.agents/skills/<nome>/SKILL.md` (+ assets) e linkar em `.claude/skills/`:
  ```bash
  node -e "require('fs').symlinkSync('<raiz>/.agents/skills/<nome>', '<raiz>/.claude/skills/<nome>', 'junction')"
  ```
  Skills locais NÃO entram no `skills-lock.json`. Locais atuais: `animejs`, `clean-code`, `iconsax-icons`, `jitter-motion`, `svgator-animations`.

### Skills instaladas
- **clean-code** (local) — padrão de qualidade de código do projeto (princípios do livro Código Limpo / Clean Code). Regras inegociáveis + checklist de odores; usar ao escrever, revisar ou refatorar QUALQUER código. Agente revisor: `.claude/agents/clean-code-reviewer.md`.
- **iconsax-icons** (local) — sistema oficial de ícones. Template de animados em `.agents/skills/iconsax-icons/assets/AnimatedIcon.tsx`.
- **svgator-animations** (local) — animações vetoriais exportadas do SVGator. Template do player em `.agents/skills/svgator-animations/assets/SvgatorPlayer.tsx`.
- **jitter-motion** (local) — motion design em vídeo/Lottie exportado do Jitter. Template em `.agents/skills/jitter-motion/assets/JitterVideo.tsx`.
- **animejs** (local) — referência de anime.js v4.4.1 (15 docs verificados contra `vendor/anime/`). Animação via código.
- **impeccable** — workflow de design/polish de UI.
- **13 skills de design/taste** via `npx skills` (ver `skills-lock.json`): brandkit, design-taste-frontend, design-taste-frontend-v1, emil-design-eng, full-output-enforcement, gpt-taste, high-end-visual-design, image-to-code, imagegen-frontend-mobile, imagegen-frontend-web, industrial-brutalist-ui, minimalist-ui, redesign-existing-projects, stitch-design-taste.

## Ícones (regra dura)
Iconsax (app.iconsax.io) é a ÚNICA fonte de ícones — nunca lucide-react, heroicons, react-icons, font-awesome ou emoji.
Antes de adicionar/trocar QUALQUER ícone, use a skill `iconsax-icons` (mapa de ícones do BetV, variants, tamanhos, regras de animados).

## Qualidade de código (regra dura)
Todo código escrito, revisado ou refatorado segue a skill `clean-code`. Antes de declarar
qualquer módulo pronto, varrer o checklist `.agents/skills/clean-code/reference/odores.md` —
cada heurística violada exige justificativa explícita.

## Animações (qual sistema usar)
- Ícone animado pequeno de UI (Lottie) → skill `iconsax-icons`
- Cena/ilustração/logo vetorial interativa exportada do SVGator → skill `svgator-animations`
- Vídeo / motion graphics / animação transparente sobre o layout (Jitter) → skill `jitter-motion`
- Animação orquestrada por código (DOM, scroll, timeline, contadores) → skill `animejs`
Nunca anime o mesmo elemento por dois sistemas ao mesmo tempo (conflito de transform).

## Vendor
`vendor/anime/` — clone do anime.js v4.4.1: ground truth da skill `animejs` (tem `.git` próprio; não commitar como submódulo acidental).
