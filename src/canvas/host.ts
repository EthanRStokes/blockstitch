// The single point where a host app wires its own backend/data into
// blockwork's canvas — configured once at startup (`configureCanvas`), then
// read by canvasDrag.ts, valueDrag.ts, and the canvas components as a module
// singleton, the same "configure once, read everywhere" shape every other
// registry in this package uses.
import type { BlockNode, NodePath, ValueLocation } from '../graph/blockGraph';
import type { ValueNode } from '../values/valueNode';

export interface StrandLike<TNode extends BlockNode = BlockNode> {
  id: string;
  x: number;
  y: number;
  instructions: TNode[];
}

export interface FloatingValueLike {
  id: string;
  x: number;
  y: number;
  value: ValueNode;
}

export interface CommentLike {
  id: string;
  x: number;
  y: number;
  text: string;
  collapsed: boolean;
  attached_to: string | null;
}

/** One piece of a custom block's rendered prototype, in declaration order —
 * a fixed label, or a slot for one of the call's `args`. */
export type CallPiece = { kind: 'Label'; text: string } | { kind: 'Input' };

export interface CanvasDocument<TNode extends BlockNode = BlockNode> {
  /** Identifies which document this is — the canvas resets pan/zoom and
   * re-centers whenever this changes (e.g. switching between macros). */
  id?: string | null;
  strands: StrandLike<TNode>[];
  floating_values: FloatingValueLike[];
  comments: CommentLike[];
}

/** Backend mutation calls — one method per canvas gesture's eventual effect.
 * A host backed by a different transport (not just Tauri) implements the
 * same shape. Every method already matches what a host's own IPC layer
 * naturally wants to expose, so wiring one up is usually just a re-export. */
export interface CanvasBackend<TNode extends BlockNode = BlockNode> {
  addInstruction(strandId: string, path: NodePath, instruction: TNode): Promise<void>;
  addStrand(x: number | null, y: number | null, instruction: TNode | null): Promise<string>;
  removeStrand(strandId: string): Promise<void>;
  moveStrand(strandId: string, x: number, y: number): Promise<void>;
  splitStrand(strandId: string, path: NodePath, x: number, y: number): Promise<string>;
  mergeStrand(draggedId: string, targetId: string, path: NodePath): Promise<void>;
  /** Only needed if the host ever registers a shape whose whole-strand grab
   * should delete a definition rather than just detach the strand (see
   * canvasDrag.ts's trash handling); omit if not applicable. */
  deleteBlockDef?(blockId: string): Promise<void>;

  editValueField(location: ValueLocation, text: string): Promise<void>;
  takeValue(location: ValueLocation): Promise<ValueNode>;
  putValue(location: ValueLocation, value: ValueNode): Promise<void>;
  previewValue(value: ValueNode): Promise<string>;
  createFloatingValue(x: number, y: number, value: ValueNode): Promise<string>;
  moveFloatingValue(floatingId: string, x: number, y: number): Promise<void>;
  removeFloatingValue(floatingId: string): Promise<void>;

  moveComment(commentId: string, x: number, y: number): Promise<void>;
  removeComment?(commentId: string): Promise<void>;
  editCommentText?(commentId: string, text: string): Promise<void>;
  setCommentCollapsed?(commentId: string, collapsed: boolean): Promise<void>;
}

export interface CanvasHost<TNode extends BlockNode = BlockNode> {
  /** The live, reactive canvas document — called fresh each time (not
   * cached), so it should just return whatever object the host already keeps
   * in sync with its backend (e.g. `() => state.current_macro`). Mutating a
   * strand's `x`/`y` etc. in place must trigger the host's own reactivity,
   * same as any other write to that object. */
  getDocument(): CanvasDocument<TNode> | null | undefined;
  /** True while canvas edits should be refused outright (e.g. a "recording"
   * mode where the block list must stay fixed). Defaults to always-false. */
  isLocked?(): boolean;
  backend: CanvasBackend<TNode>;
  /** The `ValueNode` a fresh sidebar value-palette entry of this kind
   * represents — dispatched by the host however it likes (fixed operator
   * table, variables, custom-block calls, ...). */
  resolveFreshValue(kind: string): ValueNode;
  /** The `TNode` a fresh sidebar instruction-palette entry of this type
   * represents. `variantId`, if given, is an extra host-defined key (e.g. a
   * custom block's id for a dynamic-arity call prefab). */
  clonePaletteInstruction(type: string, variantId?: string): TNode;
  /** True if `strandId`/`path` is the current "recording target" — drives
   * the small dot shown on that row. Defaults to always-false. */
  isRecordingTarget?(strandId: string, path: NodePath): boolean;
  /** Opens the host's own right-click menu for empty canvas space. */
  onCanvasContextMenu?(e: MouseEvent): void;
  /** Opens the host's own right-click menu for one block. */
  onBlockContextMenu?(e: MouseEvent, strandId: string, path: NodePath): void;
  /** Opens the host's own right-click menu for a `Var:<name>` palette entry. */
  onVariableContextMenu?(e: MouseEvent, name: string): void;
  /** Resolves a `Call` value node's block-prototype "pieces" (labels +
   * input positions) for rendering — `undefined` if the block id isn't
   * known. Only needed if the host uses `Call` value nodes at all. */
  resolveCallPieces?(blockId: string): CallPiece[] | undefined;
  /** Looks up the backend's echoed raw text for a numeric leaf currently
   * being edited (present while the typed text doesn't parse to a valid
   * value yet) and whether it's still invalid. Omit if the host has no such
   * "invalid buffer" concept. */
  getInvalidText?(location: ValueLocation): { text: string; invalid: boolean } | null;
}

let host: CanvasHost<any> | null = null;

/** Wires the host's backend/data into blockwork's canvas — call once at
 * startup, before mounting the `<Canvas>` component. */
export function configureCanvas<TNode extends BlockNode>(config: CanvasHost<TNode>): void {
  host = config;
}

export function getHost<TNode extends BlockNode = BlockNode>(): CanvasHost<TNode> {
  if (!host) throw new Error('blockwork: configureCanvas() must be called before using the canvas');
  return host;
}

export function isLocked(): boolean {
  return getHost().isLocked?.() ?? false;
}
