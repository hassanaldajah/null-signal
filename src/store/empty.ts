// Stable empty values for store selectors. Returning a fresh `[]` from a zustand selector
// creates a new reference every render and loops forever (React error #185).
export const EMPTY_LIST: readonly never[] = Object.freeze([]);
