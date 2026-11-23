export interface StateHandlers<C> {
  enter?: (ctx: C) => void;
  update?: (ctx: C) => void;
  exit?: (ctx: C) => void;
}

/**
 * State machine generik. Dipakai untuk state game (menu, fighting, pause) dan
 * state fighter (idle, walk, attack, ...) sehingga polanya sama (pengenalan pola).
 */
export class StateMachine<K extends string, C> {
  private readonly states = new Map<K, StateHandlers<C>>();
  private currentKey: K | null = null;
  private frames = 0;

  constructor(private readonly ctx: C) {}

  get current(): K | null {
    return this.currentKey;
  }

  /** Jumlah update sejak masuk state saat ini (1 pada update pertama). */
  get framesInState(): number {
    return this.frames;
  }

  add(key: K, handlers: StateHandlers<C>): this {
    this.states.set(key, handlers);
    return this;
  }

  change(key: K): void {
    const next = this.states.get(key);
    if (!next) throw new Error(`State belum terdaftar: ${key}`);
    if (this.currentKey !== null) this.states.get(this.currentKey)?.exit?.(this.ctx);
    this.currentKey = key;
    this.frames = 0;
    next.enter?.(this.ctx);
  }

  update(): void {
    if (this.currentKey === null) return;
    this.frames++;
    this.states.get(this.currentKey)?.update?.(this.ctx);
  }
}
