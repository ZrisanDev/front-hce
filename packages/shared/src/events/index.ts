/**
 * Cross-zone inventory event bus (window-based).
 *
 * When a purchase or sale is registered in its zone, that zone dispatches
 * `emitInventoryChange()`. Other zones that display derived data (e.g. the
 * kardex zone) subscribe via `onInventoryChange()` and refresh. This keeps each
 * zone decoupled while staying consistent after writes.
 *
 * Notes:
 * - Uses a `CustomEvent` on `window` so every zone (separate Next app) on the
 *   same page origin can observe it.
 * - Both helpers are SSR-safe: they no-op when `window` is undefined.
 */

const INVENTORY_CHANGE_EVENT = "hce:inventory-change";

export type InventoryChangeOrigin = "venta" | "compra";

export interface InventoryChangePayload {
  origin?: InventoryChangeOrigin;
}

/**
 * Dispatch an inventory-change event. Optionally tag it with the origin so
 * listeners can distinguish sales from purchases.
 */
export function emitInventoryChange(payload?: InventoryChangePayload): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<InventoryChangePayload | undefined>(
      INVENTORY_CHANGE_EVENT,
      { detail: payload },
    ),
  );
}

/**
 * Subscribe to inventory-change events. Returns a cleanup function that removes
 * the listener (call it on component unmount).
 */
export function onInventoryChange(
  cb: (e: InventoryChangePayload) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<InventoryChangePayload | undefined>;
    cb(customEvent.detail ?? {});
  };

  window.addEventListener(INVENTORY_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener(INVENTORY_CHANGE_EVENT, handler);
  };
}
