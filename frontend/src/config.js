/**
 * Central config – change API URL / WS URL in one place.
 */
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";
export const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3001";
