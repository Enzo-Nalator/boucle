# Boucle !

Jeu de gestion minimaliste (style Mini Metro) sur l'économie circulaire : sur une grille, une route principale en
boucle est déjà tracée et une base peu rentable est offerte (quartier, tri, un recycleur, fabricant, décharge). Un
bâtiment collé à une route y est raccordé ; sinon on lui construit sa route (en L, à double sens). Les camions portent
seuls chaque paquet au bâtiment raccordé qui en veut, par le plus court chemin, comme sur la branche `gameplay`
(POC en cours).
L'indice de circularité (recyclé + réparé / émis) mesure la partie.

## Commandes
- `npm install` : installe les dépendances (Node >= 20.9).
- `npm run dev` : serveur de développement Vite.
- `npm test` : tests Vitest.
- `npm run check` : svelte-check / TypeScript strict.
- `npm run build` : build de production.

## Organisation
- `src/sim` : simulation pure TypeScript (sans Phaser, DOM ni `Math.random`).
- `src/modes` : directeur du mode « Réseau infini » (`endless.ts`).
- `src/render` : rendu et saisie Phaser.
- `src/ui` : interface Svelte (menu, HUD, barre d'outils, fin de partie).
- `docs/superpowers` : spec, plans et retours.

## Documentation
- Spec : `docs/superpowers/specs/2026-11-02-boucle-gameplay-design.md`
- Plans : `docs/superpowers/plans/`

## Statut
POC en cours sur la branche `autman` : « Réseau infini » lance le jeu sur grille (boucle, routes construites, base à
améliorer) ; « Campagne » est grisé, comme sur la branche `gameplay`.
