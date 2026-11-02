# Boucle !

Jeu de gestion minimaliste (style Mini Metro) sur l'économie circulaire : on trace des routes entre
quartiers, tris, recycleurs, fabricants et décharges pour que les déchets reviennent en objets.
L'indice de circularité (recyclé + réparé / émis) mesure la partie.

## Commandes
- `npm install` : installe les dépendances (Node >= 20.9).
- `npm run dev` : serveur de développement Vite.
- `npm test` : tests Vitest.
- `npm run check` : svelte-check / TypeScript strict.
- `npm run build` : build de production.

## Organisation
- `src/sim` : simulation pure TypeScript (sans Phaser, DOM ni `Math.random`).
- `src/modes` : directeur du mode A « Réseau infini » (`endless.ts`).
- `src/render` : rendu et saisie Phaser.
- `src/ui` : interface Svelte (menu, HUD, barre d'outils, fin de partie).
- `docs/superpowers` : spec, plans et retours.

## Documentation
- Spec : `docs/superpowers/specs/2026-11-02-boucle-gameplay-design.md`
- Plans : `docs/superpowers/plans/`

## Statut
M1-M3 terminés (simulation, mode A, interface). Équilibrage (M5) et campagne (M4) : non faits.
