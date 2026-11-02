# Boucle ! — Conception de la boucle de jeu

Date : 2026-11-02 · Statut : à relire avant tout code

## 1. Intention

Le POC actuel (relier des ports de même couleur) est trop simple : la couleur donne la réponse, aucune décision à prendre. L'objectif est un jeu web grand public, jouable au stylet, où le joueur **régule un réseau de filières de recyclage** en arbitrant entre des acteurs qui ont chacun leurs contraintes et leurs intérêts.

Contraintes : web, 1 à 2 développeurs assistés par l'IA, TypeScript strict, Phaser 4 + Svelte 5 + Vite. Revenus à décider plus tard (le jeu ne dépend d'aucun modèle économique). Multijoueur envisagé plus tard, hors périmètre ici mais ne doit pas être bloqué par l'architecture.

Critère de réussite : en moins de 2 minutes, un joueur novice comprend qu'il doit « garder les flux en boucle » ; en 10 minutes, il a pris des décisions d'arbitrage non évidentes (où placer un tri, quel recycleur privilégier, quand payer la décharge).

## 2. Deux modes, un seul cœur

| | **A · Réseau infini** | **C · Campagne** |
|---|---|---|
| Structure | Une partie continue, difficulté croissante jusqu'à la défaite | Manches de 2 à 3 min avec objectif, puis phase de réglage |
| Fin | Débordement d'un quartier ou faillite | Échec de l'objectif de manche, ou fin de la campagne |
| Score | Temps tenu + indice de circularité | Étoiles par manche + budget restant |
| Acteurs et intérêts | Tous disponibles, progressivement | Débloqués par contrats ; intérêts propres négociés |
| Compte requis | Non | Sauvegarde locale (navigateur) |

Les deux modes pilotent la **même simulation** ; seul diffère le « directeur de partie » (§7).

## 3. Simulation (règles communes)

Temps fixe : un pas de 50 ms, déterministe (même graine = même partie).

### 3.1 Ressources et paquets
Cinq matières : plastique, verre, métal, bio, papier. Un **paquet** porte une matière, un état **propre / contaminé**, et un drapeau **réutilisable** (≈ 30 % des paquets émis par un quartier).

### 3.2 Acteurs
Chaque acteur : capacité de file, débit (paquets/s), coût d'exploitation (par s), niveau d'amélioration.

| Acteur | Entrée | Sortie | Règle clé | Départ (à régler) |
|---|---|---|---|---|
| **Quartier** | produits (objets neufs) | déchets mixtes | Émet à débit croissant ; chaque objet reçu redevient déchet après sa durée de vie (la boucle). Déborde si sa file est pleine > 5 s. | cap. 12, émission 0,5/s |
| **Collecteur** | tout | tout | Convoie des paquets le long d'une route ; nombre de camions limité par le budget. | 2 camions |
| **Centre de tri** | mixte | par matière | Oriente chaque paquet vers la route de sa matière ; **erreur de tri** e (10 %) qui envoie un paquet sur la mauvaise route ; refuse les paquets contaminés vers la décharge. L'amélioration baisse e. | cap. 10, débit 1/s, e = 10 % |
| **Recycleur** (1 par matière) | une matière | matière recyclée | N'accepte que sa matière ; si > seuil qualité de paquets contaminés dans un lot, le lot est refusé. **Paie** à la tonne. | cap. 8, débit 0,8/s, seuil 20 % |
| **Fabricant** | matière recyclée | objets neufs | Transforme la matière recyclée en objets renvoyés vers les quartiers. | cap. 8, débit 0,6/s |
| **Réparateur** | paquets réutilisables | objets réparés | Petite capacité, supprime le déchet, durée de vie de l'objet doublée, plus gros gain d'indice. | cap. 4, débit 0,3/s |
| **Décharge / incinération** | tout | rien | Capacité infinie, coût par paquet, **fuite** qui dégrade l'indice. | 0,5 € / paquet |

### 3.3 Routes
Le joueur trace une route au stylet entre deux acteurs. Elle suit des segments à 0°/45°/90°. Coût de construction proportionnel à la longueur ; une route transporte les paquets dans un sens, à vitesse fixe, avec une capacité maximale. Un acteur sortant sur plusieurs routes alterne (round-robin) sauf **priorité** réglée par le joueur.

### 3.4 Pression et mesures
- **Débordement** : la file d'un acteur pleine bloque son amont ; un quartier plein > 5 s fait perdre la partie ou la manche.
- **Budget** : revenus (recycleurs, fabricants) − construction − exploitation − décharge. Faillite = défaite.
- **Indice de circularité** : (paquets recyclés + réparés) / paquets émis, sur une fenêtre glissante de 60 s. Fuites (décharge) = au dénominateur seulement.

### 3.5 Commandes du joueur
Tracer une route · supprimer une route (tracé inverse ou clic) · placer un acteur (palette) · améliorer un acteur · régler une priorité · rénover en urgence (coût fort, vide la file). Chaque commande est un objet sérialisable (`{ type, ... }`) appliqué par la simulation : c'est la base du rejeu et du multijoueur.

## 4. Mode A — Réseau infini

Un directeur injecte des événements sur un calendrier : toutes les ~60 s, soit un nouveau quartier, soit une nouvelle matière, soit une hausse de la contamination ou de l'émission. Pannes ponctuelles d'un acteur (10 s hors service) à partir de 5 min. Aucune méta-progression. Classement local (meilleur temps + indice).

## 5. Mode C — Campagne

**Manche** : 150 s, objectif du type « indice ≥ X % pendant 30 s consécutives, budget ≥ 0 ». 1 à 3 étoiles selon l'indice final et le budget.

**Phase de réglage** (interface Svelte) entre deux manches : 3 cartes de **contrats** proposées, le joueur en retient 1 ou 2. Chaque contrat vient d'un acteur et reflète son intérêt :
- **Recycleur** : volume minimum de matière propre en échange d'un prix garanti, pénalité si non tenu.
- **Éco-organisme** : subvention au tri, avec un seuil d'indice à respecter.
- **Collectivité** : budget de construction, mais plafond de dépense d'exploitation.
- **Fabricant** : débouché garanti pour la matière recyclée, avec un taux minimum de matière recyclée.
- **Réparateur** : débloque l'acteur, impose un flux de paquets réutilisables.

Les contrats retenus modifient les règles de la manche suivante (objectifs, prix, plafonds). Déblocage progressif des acteurs et des matières sur ~10 manches.

## 6. Direction artistique (inspirée de Mini Metro)

- Fond clair sobre ; formes géométriques plates ; pas de texte dans le jeu.
- Une forme par acteur (cercle quartier, carré tri, triangle recycleur, losange fabricant, etc.) ; une couleur par matière.
- Routes : grosses lignes colorées à angles de 45°. Paquets : petites formes sur les lignes ; contaminés = marqués d'un point sombre.
- Capacité : anneau qui se remplit autour de l'acteur ; anneau plein qui clignote = débordement imminent.
- Le thème sombre et les libellés du POC disparaissent. La lisibilité à l'œil est un critère de test (§9).

## 7. Architecture

```
src/
  sim/        TypeScript pur (aucune dépendance Phaser/DOM) : acteurs, paquets, routes,
              pas de temps, commandes, mesures, générateur à graine
  modes/      directeurs de partie : endless.ts (A), campaign.ts (C, manches + contrats)
  render/     Phaser : dessine l'état de sim/, convertit le stylet en commandes
  ui/         Svelte : HUD, menus, phase de réglage, écrans de fin
  data/       acteurs, contrats, manches (données, pas de logique)
```

Principes : `sim/` ne connaît ni Phaser ni Svelte ; `render/` et `ui/` lisent un état immuable exposé par la simulation et lui envoient des commandes. Tests unitaires sur `sim/` (Vitest) : déterminisme, débordement, contamination, boucle fermée, calcul de l'indice.

L'ancien POC (`GameScene.ts`, `levels.ts`) est remplacé ; le gestionnaire de tracé au stylet est réutilisé dans `render/`.

## 8. Jalons

1. **M1 Cœur de simulation** : `sim/` + tests, sans rendu.
2. **M2 Rendu et stylet** : DA Mini Metro, tracé de routes, placement d'acteurs, HUD minimal.
3. **M3 Mode A jouable** : directeur d'événements, défaite, score local.
4. **M4 Mode C** : manches, contrats, phase de réglage Svelte, sauvegarde locale.
5. **M5 Équilibrage et tutoriel** : réglage des valeurs de départ, premières minutes guidées, tests de lisibilité.
6. **Plus tard** : multijoueur (chaque joueur incarne un acteur ; la simulation de M1 tourne côté serveur), sons, modèle économique.

## 9. Tests et critères d'acceptation

- `sim/` : déterminisme (même graine, mêmes commandes ⇒ même état après N pas) ; chaque règle d'acteur couverte par un test.
- Parties scriptées : un réseau « bon » tient 10 min en mode A ; un réseau sans tri échoue avant 3 min.
- Test de lisibilité : trois personnes novices comprennent l'objectif sans texte en moins de 2 minutes.
- Jouabilité au stylet : tracer et supprimer une route à la tablette graphique, sans erreur de saisie fréquente.

## 10. Hors périmètre

Multijoueur, comptes et backend, sons, mobile en portrait, monétisation, localisation (français uniquement), accessibilité daltonisme au-delà de la forme distincte par acteur (à reprendre en M5).

## 11. Hypothèses à confirmer

- Les valeurs chiffrées du §3.2 sont des points de départ, à régler en M5.
- Une seule matière par paquet, pas de paquets composites.
- Sauvegarde du mode C en `localStorage` uniquement.
