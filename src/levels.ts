// Chaque sortie doit alimenter une entrée de la même ressource, sans rien perdre.
export const RES = {
  plastique: { label: 'Plastique', color: 0x3ba7ff },
  verre: { label: 'Verre', color: 0x3de0a0 },
  metal: { label: 'Métal', color: 0xc3cad6 },
  bio: { label: 'Bio', color: 0xf2a33a },
  papier: { label: 'Papier', color: 0xf2e86d },
};

export type ResKey = keyof typeof RES;

export interface NodeDef {
  name: string;
  x: number;
  y: number;
  in: ResKey[];
  out: ResKey[];
}

export interface Level {
  title: string;
  nodes: NodeDef[];
}

const menages = (x: number, y: number, ins: ResKey[], outs: ResKey[]): NodeDef => ({
  name: 'Ménages', x, y, in: ins, out: outs,
});

export const LEVELS: Level[] = [
  {
    title: 'Niveau 1 · Premiers flux',
    nodes: [
      menages(220, 360, ['plastique', 'verre'], ['plastique', 'verre']),
      { name: 'Verrerie', x: 760, y: 190, in: ['verre'], out: ['verre'] },
      { name: 'Plasturgie', x: 760, y: 530, in: ['plastique'], out: ['plastique'] },
    ],
  },
  {
    title: 'Niveau 2 · Filières croisées',
    nodes: [
      menages(120, 360, ['plastique', 'verre', 'metal', 'bio'], ['plastique', 'verre', 'metal', 'bio']),
      { name: 'Verrerie', x: 560, y: 130, in: ['verre'], out: ['verre'] },
      { name: 'Plasturgie', x: 560, y: 330, in: ['plastique'], out: ['plastique'] },
      { name: 'Fonderie', x: 920, y: 170, in: ['metal'], out: ['metal'] },
      { name: 'Compost', x: 920, y: 520, in: ['bio'], out: ['bio'] },
    ],
  },
  {
    title: 'Niveau 3 · Tout se transforme',
    nodes: [
      menages(90, 330, ['plastique', 'verre', 'metal', 'bio', 'papier'], ['plastique', 'verre', 'metal', 'bio', 'papier']),
      { name: 'Papeterie', x: 520, y: 80, in: ['papier'], out: ['papier'] },
      { name: 'Verrerie', x: 520, y: 500, in: ['verre'], out: ['verre'] },
      { name: 'Plasturgie', x: 900, y: 70, in: ['plastique'], out: ['plastique'] },
      { name: 'Fonderie', x: 900, y: 290, in: ['metal'], out: ['metal'] },
      { name: 'Compost', x: 900, y: 510, in: ['bio'], out: ['bio'] },
    ],
  },
];
