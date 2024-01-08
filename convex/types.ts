import { v, Infer } from "convex/values";

export const position = v.object({ x: v.number(), y: v.number() });
export type Position = Infer<typeof position>;

export const serverTime = v.number();
export type ServerTime = Infer<typeof serverTime>;

export const batchTime = v.number();
export type BatchTime = Infer<typeof batchTime>;
