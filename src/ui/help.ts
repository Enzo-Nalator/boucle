import { ACTOR_DEFS, DUMP_COST, FABRICATE_REVENUE, GARAGE, RECYCLE_REVENUE, ROAD_COST, SELL_REFUND } from '../sim/defs';
import type { ActorKind } from '../sim/types';
import { MAX_LEVEL, RENOVATE_COST, UPGRADE_COST } from '../sim/world';
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
    role: 'Trie les déchets mélangés des quartiers : un recycleur n’accepte que des déchets triés. Les déchets contaminés, une fois triés, ne peuvent aller qu’à la décharge.',
    inputs: 'déchets mélangés',
    outputs: 'déchets triés',
  },
  recycleur: {
    name: 'Recycleur',
    role: `Ne traite qu’une seule matière, en déchets triés et propres. Paie ${fr(RECYCLE_REVENUE)} € par paquet recyclé et produit de la matière recyclée.`,
    inputs: 'déchets triés d’une matière',
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
    role: 'Répare les paquets réutilisables : petite capacité, mais l’objet réparé tient deux fois plus longtemps avant de redevenir déchet.',
    inputs: 'déchets réutilisables',
    outputs: 'objets réparés',
  },
  decharge: {
    name: 'Décharge',
    role: `Absorbe tous les déchets sans limite (jamais la matière ni les objets), mais coûte ${fr(DUMP_COST)} € par paquet et fait baisser l’indice de circularité. Une solution de secours.`,
    inputs: 'tous les déchets',
    outputs: 'rien (perte)',
  },
  garage: {
    name: 'Garage',
    role: `Entretient les camions. Tant qu’il est relié à la route, ils roulent ${GARAGE.speed * 100} % plus vite et portent ${GARAGE.load} paquet de plus par niveau du garage (le meilleur compte, pas la somme). Améliore-le pour aller plus loin.`,
    inputs: 'rien',
    outputs: 'camions plus rapides et plus chargés',
  },
};

export const ACTOR_ORDER: ActorKind[] = [
  'quartier',
  'tri',
  'recycleur',
  'fabricant',
  'reparateur',
  'decharge',
  'garage',
];

/** Numéro d'affichage d'un acteur dans le livre : 01 à 07. */
export const actorNumber = (kind: ActorKind): string => String(ACTOR_ORDER.indexOf(kind) + 1).padStart(2, '0');

/** Chiffres du simulateur, formatés pour la fiche d'un acteur. */
export function actorStats(kind: ActorKind): { capacity: string; rate: string; cost: string; upkeep: string } {
  const d = ACTOR_DEFS[kind];
  return {
    capacity: d.capacity >= 1e6 ? 'file illimitée' : d.capacity ? `file ${d.capacity}` : 'pas de stock',
    rate: d.rate ? `${fr(d.rate)} / s` : `camions +${GARAGE.speed * 100} % / niveau`,
    cost: d.cost === 0 ? 'offert' : `${d.cost} €`,
    upkeep: d.upkeep === 0 ? 'sans entretien' : `${fr(d.upkeep)} € / s`,
  };
}

export const ALL_TOOLS: Tool[] = [
  'road',
  'place:tri',
  'place:recycleur',
  'place:fabricant',
  'place:reparateur',
  'place:decharge',
  'place:garage',
  'upgrade',
  'renovate',
  'sell',
  'delete',
];

/** Prix affiché sur le bouton d'un outil (undefined : rien à payer à la pose). */
export const toolCost = (tool: Tool): number | undefined =>
  tool === 'road'
    ? ROAD_COST
    : tool.startsWith('place:')
      ? ACTOR_DEFS[tool.slice('place:'.length) as ActorKind].cost
      : undefined;

/** Titre et texte de l’infobulle d’un outil de la barre d’actions. */
export function toolInfo(tool: Tool): { title: string; text: string } {
  if (tool.startsWith('place:')) {
    const kind = tool.slice('place:'.length) as ActorKind;
    const { name, role } = ACTOR_INFO[kind];
    return {
      title: `Placer : ${name.toLowerCase()}`,
      text: `${role}${kind === 'recycleur' ? ' Choisis sa matière au-dessus de la barre d’outils.' : ''} Collé à une route, il y est raccordé ; sinon, construis-lui la sienne. Coût : ${ACTOR_DEFS[kind].cost} €.`,
    };
  }
  switch (tool) {
    case 'road':
      return {
        title: 'Construire une route',
        text: `Glisse d’un bâtiment ou d’une route jusqu’à une autre : la route se trace en L, par le coude le moins cher, et réutilise gratuitement les routes existantes. Pendant le glisser, le sombre sera construit, le clair est déjà là, et le prix s’affiche. Les routes sont à double sens ; les camions vont d’eux-mêmes aux bâtiments raccordés, par le plus court chemin. Coût : ${ROAD_COST} € par case.`,
      };
    case 'upgrade':
      return {
        title: 'Améliorer',
        text: `Touche un acteur pour monter son niveau (jusqu’au niveau ${MAX_LEVEL}) : il traite plus vite. Coût : ${UPGRADE_COST} €. Sans effet sur les quartiers et les décharges.`,
      };
    case 'sell':
      return {
        title: 'Vendre un bâtiment',
        text: `Touche un bâtiment pour le vendre : tu récupères ${SELL_REFUND * 100} % de son prix d’achat et sa case se libère. Ce qu’il stocke et les paquets en route vers lui sont perdus. Les quartiers ne se vendent pas.`,
      };
    case 'renovate':
      return {
        title: 'Rénover',
        text: `Touche un acteur pour vider ses files d’attente en urgence (les paquets sont perdus). Coût : ${RENOVATE_COST} €.`,
      };
    default:
      return {
        title: 'Retirer une route',
        text: 'Touche une case de route construite pour la retirer (la boucle reste). Les camions qui devaient y passer sont perdus.',
      };
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
      'Chaque acteur est un bâtiment : des maisons pour le quartier, une usine violette pour le tri, une usine de la couleur de sa matière pour le recycleur, un toit en dents de scie pour le fabricant, une maison à croix pour le réparateur, un tas pour la décharge.',
      'La boucle est la route principale, déjà construite ; les routes sont à double sens. Un bâtiment collé à une route y est raccordé, les autres ont besoin d’une route construite. Chaque camion porte un paquet vers le bâtiment raccordé qui en veut, par le plus court chemin : sa caisse a la couleur de la matière, un point sombre signale un paquet contaminé, une croix blanche un déchet réutilisable. Un feu marque chaque carrefour.',
      'Sous chaque acteur, les cases montrent ce qu’il stocke : la couleur est la matière, un carré est un déchet, un rond de la matière recyclée, un triangle un objet. Un point sombre signale un déchet contaminé. Un halo rouge et un panneau « ! » sur un quartier annoncent un débordement.',
      'Un acteur grisé est en panne pendant quelques secondes : il ne traite plus rien, mais les paquets continuent de s’empiler devant lui.',
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
    actors: ['fabricant', 'reparateur', 'decharge', 'garage'],
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
      'La partie démarre avec une boucle de base qui perd de l’argent : un seul recycleur, et le verre part à la décharge. À toi de l’améliorer.',
      'Construis vite la route de chaque nouveau quartier : sans route, il déborde en moins d’une minute.',
      'Un centre de tri protège les recycleurs de la contamination. La décharge sert de filet : elle ne reçoit que ce qu’aucun autre bâtiment raccordé n’accepte. Garde-la raccordée, sinon le tri se bouche avec les déchets contaminés.',
    ],
  },
];
