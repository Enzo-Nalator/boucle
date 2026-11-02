import { ACTOR_DEFS } from '../sim/defs';
import type { ActorKind } from '../sim/types';
import { MAX_LEVEL, RENOVATE_COST, UPGRADE_COST } from '../sim/world';
import type { Tool } from './store.svelte';

export const ACTOR_INFO: Record<ActorKind, { name: string; role: string; inputs: string; outputs: string }> = {
  quartier: {
    name: 'Quartier',
    role: 'Produit des déchets en continu et reçoit les objets neufs, qui redeviennent des déchets une minute plus tard. Il déborde si sa file reste pleine plus de 5 secondes : c’est la défaite.',
    inputs: 'objets neufs',
    outputs: 'déchets mélangés',
  },
  collecteur: {
    name: 'Collecteur',
    role: 'Relais de transport : fait passer tous les paquets. Amélioré, ses routes transportent plus de paquets à la fois.',
    inputs: 'tous les paquets',
    outputs: 'tous les paquets',
  },
  tri: {
    name: 'Centre de tri',
    role: 'Oriente chaque paquet vers la route de sa matière et envoie les paquets contaminés à la décharge. Il se trompe parfois (10 % au départ) ; l’amélioration réduit les erreurs.',
    inputs: 'déchets mélangés',
    outputs: 'déchets par matière',
  },
  recycleur: {
    name: 'Recycleur',
    role: 'Ne traite qu’une seule matière et refuse les lots trop contaminés (plus de 20 %). Paie 2 € par paquet recyclé et produit de la matière recyclée.',
    inputs: 'déchets d’une matière',
    outputs: 'matière recyclée',
  },
  fabricant: {
    name: 'Fabricant',
    role: 'Transforme la matière recyclée en objets neufs (1 € par objet) renvoyés vers les quartiers : c’est lui qui referme la boucle.',
    inputs: 'matière recyclée',
    outputs: 'objets neufs',
  },
  reparateur: {
    name: 'Réparateur',
    role: 'Répare les paquets réutilisables : petite capacité, mais l’objet réparé tient deux fois plus longtemps avant de redevenir déchet.',
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

export const ACTOR_ORDER: ActorKind[] = ['quartier', 'collecteur', 'tri', 'recycleur', 'fabricant', 'reparateur', 'decharge'];

/** Numéro d'affichage d'un acteur dans le livre : 01 à 07. */
export const actorNumber = (kind: ActorKind): string => String(ACTOR_ORDER.indexOf(kind) + 1).padStart(2, '0');

const fr = (n: number): string => String(n).replace('.', ',');

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
  'place:collecteur', 'place:tri', 'place:recycleur', 'place:fabricant', 'place:reparateur', 'place:decharge',
  'upgrade', 'renovate', 'priority', 'delete',
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
      return { title: 'Tracer une route', text: 'Glisse d’un acteur à un autre. Les routes suivent des segments à 0°, 45° ou 90° ; le coût dépend de leur longueur. Glisser dans le sens inverse d’une route existante la supprime.' };
    case 'upgrade':
      return { title: 'Améliorer', text: `Touche un acteur pour monter son niveau (jusqu’au niveau ${MAX_LEVEL}) : il traite plus vite. Coût : ${UPGRADE_COST} €. Sans effet sur les quartiers et les décharges.` };
    case 'renovate':
      return { title: 'Rénover', text: `Touche un acteur pour vider ses files d’attente en urgence (les paquets sont perdus). Coût : ${RENOVATE_COST} €.` };
    case 'priority':
      return { title: 'Priorité', text: 'Touche une route pour changer sa priorité (0, 1 ou 2). Les routes prioritaires sont servies en premier et tracées plus épaisses.' };
    default:
      return { title: 'Supprimer une route', text: 'Touche une route pour la supprimer. Les paquets en transit sont perdus.' };
  }
}

export interface HelpPage {
  layout: 'goal' | 'board' | 'actors' | 'tools' | 'tips';
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
      'Deux jauges comptent : le budget (€), qui paie la construction, l’entretien et la décharge, et l’indice de circularité (%), la part des déchets réellement recyclés ou réparés sur la dernière minute.',
      'La partie s’arrête si un quartier déborde plus de 5 secondes, ou si le budget passe sous zéro. Le score est le temps tenu, puis l’indice.',
    ],
  },
  {
    layout: 'board',
    title: 'Lire le plateau',
    backdrop: 'PLATEAU',
    paragraphs: [
      'Chaque acteur a sa forme : cercle pour le quartier, carré pour le tri, triangle pour le recycleur, losange pour le fabricant, croix pour le réparateur, hexagone pour la décharge.',
      'Les points qui circulent sur les routes sont des paquets. Leur couleur donne la matière (plastique, verre, métal, bio, papier) ; un point sombre au centre signale un paquet contaminé.',
      'L’anneau autour d’un acteur se remplit avec sa file d’attente. Un anneau qui clignote sur un quartier annonce un débordement imminent.',
      'Un acteur grisé est en panne pendant quelques secondes : il ne traite plus rien, mais les paquets continuent de s’empiler devant lui.',
    ],
  },
  {
    layout: 'actors',
    title: 'Les acteurs',
    subtitle: '1/2',
    backdrop: 'ACTEURS',
    actors: ['quartier', 'collecteur', 'tri', 'recycleur'],
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
    paragraphs: ['Choisis un outil dans la barre du bas, puis touche ou glisse sur le plateau. Survole un bouton pour lire son effet.'],
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
      'Un paquet bloqué devant un acteur qui le refuse gêne toute la file : vérifie qu’une route mène bien chaque matière à son recycleur, ou rénove l’acteur bloqué.',
    ],
  },
];
