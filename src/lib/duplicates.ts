/** Repetidas = cópias além da primeira (para completar um álbum). */
export function duplicateCountFromOwned(ownedCount: number): number {
  return Math.max(0, ownedCount - 1);
}
