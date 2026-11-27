import type { ActionReturn } from 'svelte/action';
import { tip } from './store.svelte';

interface Info {
  title: string;
  text: string;
}

/** Élément dont l'infobulle est affichée : lui seul peut la changer ou la fermer. */
let owner: HTMLElement | null = null;

/** Action Svelte : infobulle qui suit la souris ou le stylet (pas le doigt) et s'affiche aussi au focus clavier. */
export function tooltip(node: HTMLElement, info: Info): ActionReturn<Info> {
  let current = info;
  const show = (x: number, y: number) => {
    owner = node;
    tip.title = current.title;
    tip.text = current.text;
    tip.x = x;
    tip.y = y;
    tip.visible = true;
  };
  const hide = () => {
    if (owner !== node) return;
    owner = null;
    tip.visible = false;
  };
  const onEnter = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') show(e.clientX, e.clientY);
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'touch' && tip.visible && owner === node) {
      tip.x = e.clientX;
      tip.y = e.clientY;
    }
  };
  const onFocus = () => {
    if (!node.matches(':focus-visible')) return;
    const r = node.getBoundingClientRect();
    show(r.left + r.width / 2, r.top);
  };
  node.addEventListener('pointerenter', onEnter);
  node.addEventListener('pointermove', onMove);
  node.addEventListener('pointerleave', hide);
  node.addEventListener('focus', onFocus);
  node.addEventListener('blur', hide);
  return {
    update(next: Info) {
      current = next;
      if (tip.visible && owner === node) {
        tip.title = next.title;
        tip.text = next.text;
      }
    },
    destroy() {
      hide();
      node.removeEventListener('pointerenter', onEnter);
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerleave', hide);
      node.removeEventListener('focus', onFocus);
      node.removeEventListener('blur', hide);
    },
  };
}
