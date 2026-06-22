// Solo game — no server-authoritative rules needed. The platform still requires a
// code module at the zip root; this is the mandated solo stub. All gameplay lives
// client-side in game.js (deterministic, fixed-timestep, seeded RNG).
export const meta = { game: "elemental-td", minPlayers: 1, maxPlayers: 1 };
export function setup() { return {}; }
export function validateAction() { return { ok: true }; }
export function applyAction(state) { return state; }
export function isGameOver() { return { over: false }; }
export function viewFor(state) { return state; }
