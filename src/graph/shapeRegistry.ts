// What a block *type* looks like structurally — a plain single-line block
// ('stack'), an entry-point trigger with nothing allowed above it ('header'),
// a block nothing may ever be stacked below ('cap'), or a C-block wrapping
// one or more nested instruction lists ('wrap'). The host registers one of
// these per instruction type at startup; every generic tree-navigation
// helper in blockGraph.ts (and the drag/snap engine in canvas/canvasDrag.ts)
// reads shape from here instead of hardcoding type names.
import type { Component } from 'vue';
import type { BlockNode } from './blockGraph';

export interface BlockShapeDescriptor<TNode extends BlockNode = BlockNode> {
  kind: 'stack' | 'header' | 'cap' | 'wrap';
  /** Icon shown in the block's row (and, for a wrap block, its head line). */
  icon?: Component;
  /** Only meaningful for `kind: 'header'` — the subset of headers that are
   * "entry point" triggers (vs. e.g. a custom block's own definition header)
   * and get a quiet accent tint. */
  isEntryTrigger?: boolean;
  /** Only meaningful for `kind: 'wrap'` — this node's nested instruction
   * lists, in slot order (index 0 = slot 0, etc). Read-only navigation. */
  getSlots?(node: TNode): TNode[][];
  /** Only meaningful for `kind: 'wrap'` — returns a copy of `node` with every
   * slot list replaced by `fn(originalSlot, slotIndex)`. Used to regenerate
   * ids through a nested tree without the generic code needing to know each
   * wrap type's actual field names (`body`/`then_body`/`else_body`/...). */
  mapSlots?(node: TNode, fn: (slot: TNode[], slotIndex: number) => TNode[]): TNode;
}

const registry = new Map<string, BlockShapeDescriptor<any>>();

/** Registers the shape for one block type — call once per type at host
 * startup. Re-registering the same type overwrites the previous entry. */
export function registerBlockShape<TNode extends BlockNode>(type: string, shape: BlockShapeDescriptor<TNode>): void {
  registry.set(type, shape);
}

export function shapeFor(type: string): BlockShapeDescriptor | undefined {
  return registry.get(type);
}

export function isHeaderType(type: string): boolean {
  return shapeFor(type)?.kind === 'header';
}

export function isCapType(type: string): boolean {
  return shapeFor(type)?.kind === 'cap';
}

export function isWrapType(type: string): boolean {
  return shapeFor(type)?.kind === 'wrap';
}

export function isEntryTriggerType(type: string): boolean {
  const shape = shapeFor(type);
  return shape?.kind === 'header' && !!shape.isEntryTrigger;
}

export function iconFor(type: string): Component | undefined {
  return shapeFor(type)?.icon;
}

/** Test-only/dev-only: clears every registered shape. Not used by app code. */
export function _clearBlockShapes(): void {
  registry.clear();
}
