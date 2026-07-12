/**
 * index.js — Sync provider registry.
 *
 * Central place to register and look up CalendarProvider implementations.
 */
import { googleProvider } from "./googleProvider.js";
import { calDavProvider } from "./calDavProvider.js";
import { isValidProvider } from "./providerInterface.js";

const registry = [googleProvider, calDavProvider].filter(isValidProvider);

/** @returns {import('./providerInterface.js').CalendarProvider[]} */
export function listProviders() {
  return registry;
}

/**
 * @param {string} id
 * @returns {import('./providerInterface.js').CalendarProvider|undefined}
 */
export function getProvider(id) {
  return registry.find((p) => p.id === id);
}

export { googleProvider, calDavProvider };
