import {
  ACTOR_DEFS,
  CROSS_COST,
  DEMOLISH_REFUND,
  FABRICATE_REVENUE,
  RECYCLE_REVENUE,
  REPAIR_REVENUE,
} from '../sim/defs';
import type { ActorKind } from '../sim/types';
import { OUTAGE_FROM } from '../modes/endless';
import { MAX_LEVEL, RENOVATE_COST, UPGRADE_RATIO } from '../sim/world';
import type { Tool } from './store.svelte';

const fr = (n: number): string => String(n).replace('.', ',');

export const ACTOR_INFO: Record<ActorKind, { name: string; role: string; inputs: string; outputs: string }> = {
  quartier: {
    name: 'Quartier',
    role: 'Produit des déchets en continu et reçoit les objets neufs, qui redeviennent des déchets une minute plus tard. Il déborde si sa file reste pleine plus de 5 secondes : c’est la défaite.',
    inputs: 'objets neufs',
    outputs: 'déchets mélangés',
  },
  tri: {
    name: 'Centre de tri',
    role: 'Les quartiers lui envoient leurs déchets en priorité. Il envoie les réutilisables (✚) au réparateur tant que celui-ci a de la place, les autres au recycleur de leur matière, les contaminés à la décharge. Il se trompe parfois (10 % au départ).',
    inputs: 'déchets mélangés',
    outputs: 'déchets triés',
  },
  recycleur: {
    name: 'Recycleur',
    role: `Ne traite qu’une seule matière, choisie avant de le poser (bande au-dessus de la barre), et refuse les lots trop contaminés (plus de 20 %). Paie ${fr(RECYCLE_REVENUE)} € par paquet recyclé et produit de la matière recyclée.`,
    inputs: 'déchets d’une matière',
    outputs: 'matière recyclée',
  },
  fabricant: {
    name: 'Fabricant',
    role: `Transforme la matière recyclée en objets neufs (${fr(FABRICATE_REVENUE)} € par objet) renvoyés vers les quartiers : c’est lui qui referme la boucle.`,
    inputs: 'matière recyclée',
    outputs: 'objets neufs',
  },
  reparateur: {
    name: 'Réparateur',
    role: `Répare les déchets réutilisables (✚) en objets renvoyés aux quartiers (${fr(REPAIR_REVENUE)} € chacun), qui tiennent deux fois plus longtemps. Lent : le surplus part au recycleur.`,
    inputs: 'déchets réutilisables',
    outputs: 'objets réparés',
  },
  decharge: {
    name: 'Décharge',
    role: 'Absorbe tout sans limite, mais coûte 0,5 € par paquet et fait baisser l’indice de circularité. Une solution de secours.',
    inputs: 'tout',
    outputs: 'rien (perte)',
  },
};

export const ACTOR_ORDER: ActorKind[] = ['quartier', 'tri', 'recycleur', 'fabricant', 'reparateur', 'decharge'];

/** Numéro d'affichage d'un acteur dans le livre : 01 à 06. */
export const actorNumber = (kind: ActorKind): string => String(ACTOR_ORDER.indexOf(kind) + 1).padStart(2, '0');

/** Chiffres du simulateur, formatés pour la fiche d'un acteur. */
export function actorStats(kind: ActorKind): { capacity: string; rate: string; cost: string; upkeep: string } {
  const d = ACTOR_DEFS[kind];
  return {
    capacity: d.capacity >= 1e6 ? 'file illimitée' : `file ${d.capacity}`,
    rate: `${fr(d.rate)} / s`,
    cost: d.cost === 0 ? 'offert' : `${d.cost} €`,
    upkeep: d.upkeep === 0 ? 'sans entretien' : `${fr(d.upkeep)} € / s`,
  };
}

export const ALL_TOOLS: Tool[] = [
  'route',
  'place:tri',
  'place:recycleur',
  'place:fabricant',
  'place:reparateur',
  'place:decharge',
  'upgrade',
  'renovate',
  'priority',
  'delete',
  'demolish',
];

/** Titre et texte de l’infobulle d’un outil de la barre d’actions. */
export function toolInfo(tool: Tool): { title: string; text: string } {
  if (tool.startsWith('place:')) {
    const kind = tool.slice('place:'.length) as ActorKind;
    const { name, role } = ACTOR_INFO[kind];
    return { title: `Placer : ${name.toLowerCase()}`, text: `${role} Coût : ${ACTOR_DEFS[kind].cost} €.` };
  }
  switch (tool) {
    case 'route':
      return {
        title: 'Tracer une route',
        text: `Glisse entre deux bâtiments ou routes. Les routes sont à double sens et les camions choisissent leur chemin. Si une route proche peut servir, le tracé s’y branche au lieu de tout reconstruire. Sur l’eau : un pont, bien plus cher. Croiser une route : un carrefour (${CROSS_COST} €). Les camions ralentissent aux embranchements.`,
      };
    case 'upgrade':
      return {
        title: 'Améliorer',
        text: `Touche un acteur pour monter son niveau (jusqu’au niveau ${MAX_LEVEL}) : il traite plus vite. Coût : ${UPGRADE_RATIO * 100} % de la valeur du bâtiment (achat et améliorations déjà payées), affiché au survol. Sans effet sur les quartiers et les décharges.`,
      };
    case 'renovate':
      return {
        title: 'Rénover',
        text: `Touche un acteur pour vider ses files d’attente en urgence (les paquets sont perdus). Coût : ${RENOVATE_COST} €.`,
      };
    case 'priority':
      return {
        title: 'Priorité',
        text: 'Touche un bâtiment pour changer sa priorité (0, 1 ou 2). À type égal, le plus prioritaire est servi d’abord.',
      };
    case 'demolish':
      return {
        title: 'Démolir un bâtiment',
        text: `Touche un bâtiment pour le raser ; les routes qui passaient par lui restent. Tu récupères ${DEMOLISH_REFUND * 100} % de son prix ; les paquets stockés sont perdus. Les quartiers ne se démolissent pas.`,
      };
    default:
      return {
        title: 'Supprimer une route',
        text: 'Touche un tronçon de route pour le supprimer. Les paquets qui y roulent sont perdus.',
      };
  }
}

export interface HelpPage {
  layout: 'goal' | 'board' | 'routes' | 'suivi' | 'actors' | 'tools' | 'tips';
  title: string;
  /** Mot géant très pâle en fond de double page. */
  backdrop: string;
  /** Précision affichée à côté du titre (ex. « 1/2 »). */
  subtitle?: string;
  paragraphs?: string[];
  actors?: ActorKind[];
  tools?: Tool[];
}

export const HELP_PAGES: HelpPage[] = [
  {
    layout: 'goal',
    title: 'But du jeu',
    backdrop: 'BOUCLE',
    paragraphs: [
      'Tu régules un réseau de recyclage. Les quartiers produisent des déchets sans arrêt : ta mission est de les garder en boucle. Les déchets sont triés, recyclés, transformés en objets neufs qui reviennent aux quartiers, et le cycle recommence.',
      'Deux jauges comptent : le budget (€), rempli par les recycleurs, fabricants et réparateurs (les « +€ » sur le plateau ; touche le budget pour le détail), et l’indice de circularité (%), la part des déchets réellement recyclés ou réparés sur la dernière minute.',
      'La partie s’arrête si un quartier déborde plus de 5 secondes, ou si le budget passe sous zéro. Le score est le temps tenu, puis l’indice.',
    ],
  },
  {
    layout: 'board',
    title: 'Lire le plateau',
    backdrop: 'PLATEAU',
    paragraphs: [
      'Chaque acteur est un bâtiment : des maisons pour le quartier, une usine violette pour le tri, une usine de la couleur de sa matière pour le recycleur, un toit en dents de scie pour le fabricant, une maison à croix pour le réparateur, un tas pour la décharge.',
      'Les camions qui roulent sur les routes transportent des paquets. La couleur de leur caisse donne la matière (plastique, verre, métal, bio, papier) ; un point sombre signale un paquet contaminé, une croix blanche un déchet réutilisable.',
      'Sous chaque acteur, les cases montrent ce qu’il stocke : la couleur est la matière, un carré est un déchet, un rond de la matière recyclée, un triangle un objet. Une case entourée de rouge et un panneau « ! » signalent un paquet que personne n’accepte ; il ne bloque pas les autres, mais il est jeté au bout de 8 secondes (l’indice baisse). Un halo rouge sur un quartier annonce un débordement.',
      'Un acteur grisé est en panne pendant quelques secondes : il ne traite plus rien, mais les paquets continuent de s’empiler devant lui.',
    ],
  },
  {
    layout: 'routes',
    title: 'Les routes',
    backdrop: 'ROUTES',
    paragraphs: [
      'Glisse depuis un bâtiment ou une route jusqu’à un autre. Les routes sont à double sens : relie tout au même réseau et les camions prennent le plus court chemin.',
      'Si une route proche peut servir, le nouveau tracé s’y branche. Pendant le glisser, le sombre sera construit, le clair est réutilisé, et le prix s’affiche.',
      `Les camions ralentissent aux embranchements et aux carrefours (feux). Croiser une route coûte ${CROSS_COST} € de plus ; s’y brancher ne coûte que le tronçon neuf.`,
      'On ne construit pas sur l’eau, mais une route la franchit par un pont, bien plus cher. Supprimer un tronçon efface aussi les impasses qui en restent.',
    ],
  },
  {
    layout: 'suivi',
    title: 'Suivre la partie',
    backdrop: 'SUIVI',
    paragraphs: [
      `L’argent s’affiche là où il bouge : +${fr(RECYCLE_REVENUE)} € au recycleur, +${fr(FABRICATE_REVENUE)} € au fabricant, +${fr(REPAIR_REVENUE)} € au réparateur ; la décharge et l’entretien coûtent. Touche le budget pour le détail par minute.`,
      'Un quartier envoie ses déchets au tri s’il y en a un, sinon au réparateur (✚), au recycleur, puis à la décharge. La matière recyclée va au fabricant, les objets aux quartiers.',
      'La barre du haut montre les matières en jeu (en rouge : sans recycleur), les formes et la part de déchets sales. Une annonce signale chaque évolution : nouvelle matière, plus de saleté, plus de déchets.',
      `La bulle du haut compte à rebours avant le prochain événement ; les pannes commencent à ${OUTAGE_FROM / 60} minutes. Le bouton ❚❚ ou la touche Échap met en pause, pour lire l’aide ou quitter.`,
    ],
  },
  {
    layout: 'actors',
    title: 'Les acteurs',
    subtitle: '1/2',
    backdrop: 'ACTEURS',
    actors: ['quartier', 'tri', 'recycleur'],
  },
  {
    layout: 'actors',
    title: 'Les acteurs',
    subtitle: '2/2',
    backdrop: 'CIRCUIT',
    actors: ['fabricant', 'reparateur', 'decharge'],
  },
  {
    layout: 'tools',
    title: 'Les outils',
    backdrop: 'OUTILS',
    paragraphs: [
      'Choisis un outil dans la barre du bas, puis touche ou glisse sur le plateau. Survole un bouton pour lire son effet.',
    ],
    tools: ALL_TOOLS,
  },
  {
    layout: 'tips',
    title: 'Conseils',
    backdrop: 'ASTUCES',
    paragraphs: [
      'Construis ton réseau étape par étape : un réseau complet bâti d’un coup épuise le budget de départ en quelques secondes.',
      'Relie vite chaque nouveau quartier : sans route, il déborde en moins d’une minute.',
      'Un centre de tri protège les recycleurs de la contamination. Garde la décharge pour les paquets que rien d’autre n’accepte.',
      'Un panneau « ! » veut dire que personne de relié ne veut un paquet : raccorde au réseau son recycleur, ou une décharge pour les contaminés, avant qu’il soit jeté.',
    ],
  },
];
