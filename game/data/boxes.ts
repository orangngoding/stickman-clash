import type { Rect } from "../types";

// Hurtbox relatif terhadap kaki fighter (x terhadap tengah badan, simetris kiri-kanan).
export const HURTBOX_STAND: Rect = { x: -22, y: -145, w: 44, h: 145 };
export const HURTBOX_CROUCH: Rect = { x: -24, y: -92, w: 48, h: 92 };
