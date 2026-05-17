// ---------------------------------------------------------------------------
// Room Zone definitions and context-aware spatial routing for agents.
// Zones are tile-coordinate rectangles carved from the 30x20 office layout.
// ---------------------------------------------------------------------------

import type { Character, Seat, AgentStatus, SessionInfo } from '../pixel-types'

// ---------------------------------------------------------------------------
// Zone types
// ---------------------------------------------------------------------------

export interface RoomZone {
  id: RoomZoneId
  label: string
  bounds: { minCol: number; maxCol: number; minRow: number; maxRow: number }
  /** Walkable tiles agents can target within this zone */
  waypoints: Array<{ col: number; row: number }>
  /** When true, only agents whose seat is inside this zone may wander here */
  restricted?: boolean
}

export type RoomZoneId =
  | 'ceo-office'
  | 'meeting'
  | 'workspace'
  | 'kitchen'
  | 'break-room'

// ---------------------------------------------------------------------------
// Zone definitions (based on office-layout.ts 30x20 grid — gruai.tmx)
// ---------------------------------------------------------------------------

// Zone IDs are kept as-is (referenced widely in office-layout/constants/tilesets).
// Labels are user-facing — they encode the physics-lab semantics. See labs.ts for
// the full per-lab metadata (icon, tagline, topics, system prompt, scenarios).
export const ROOM_ZONES: Record<RoomZoneId, RoomZone> = {
  'ceo-office': {
    id: 'ceo-office',
    label: '⚙️ 力学实验室',
    bounds: { minCol: 0, maxCol: 7, minRow: 0, maxRow: 11 },
    waypoints: [
      { col: 3, row: 6 },
      { col: 5, row: 6 },
      { col: 3, row: 9 },
      { col: 5, row: 9 },
    ],
  },
  workspace: {
    id: 'workspace',
    label: '🧲 电磁场实验室',
    bounds: { minCol: 8, maxCol: 22, minRow: 0, maxRow: 11 },
    waypoints: [
      { col: 12, row: 6 },
      { col: 15, row: 6 },
      { col: 18, row: 6 },
      { col: 12, row: 10 },
      { col: 18, row: 10 },
    ],
  },
  meeting: {
    id: 'meeting',
    label: '🔭 光学实验室',
    bounds: { minCol: 23, maxCol: 29, minRow: 0, maxRow: 11 },
    waypoints: [
      { col: 25, row: 5 },
      { col: 27, row: 5 },
      { col: 25, row: 7 },
      { col: 27, row: 7 },
      { col: 26, row: 9 },
    ],
  },
  kitchen: {
    id: 'kitchen',
    label: '🌡️ 热学实验室',
    bounds: { minCol: 0, maxCol: 7, minRow: 12, maxRow: 19 },
    waypoints: [
      { col: 3, row: 14 },
      { col: 5, row: 14 },
      { col: 3, row: 17 },
      { col: 5, row: 17 },
    ],
  },
  'break-room': {
    id: 'break-room',
    label: '☕ 休息区',
    bounds: { minCol: 8, maxCol: 29, minRow: 12, maxRow: 19 },
    waypoints: [
      { col: 12, row: 16 },
      { col: 18, row: 16 },
      { col: 24, row: 16 },
      { col: 15, row: 18 },
    ],
  },
}

// ---------------------------------------------------------------------------
// Tool classification helpers
// ---------------------------------------------------------------------------

/** Check if a tool name suggests agent/discussion work */
function isAgentTool(toolName: string | undefined): boolean {
  if (!toolName) return false
  return toolName.includes('Agent') || toolName.includes('agent')
}

// ---------------------------------------------------------------------------
// Zone access helpers
// ---------------------------------------------------------------------------

/**
 * Check whether an agent is allowed to wander into a zone.
 * Unrestricted zones allow everyone. Restricted zones only allow agents
 * whose assigned seat is physically inside the zone bounds.
 */
export function isAgentAllowedInZone(
  ch: Character,
  zoneId: RoomZoneId,
  seats: Map<string, Seat>,
): boolean {
  const zone = ROOM_ZONES[zoneId]
  if (!zone.restricted) return true
  // Player-controlled characters are always allowed (CEO exemption)
  if (ch.isPlayerControlled) return true
  // Check if the agent's seat is inside the restricted zone
  if (!ch.seatId) return false
  const seat = seats.get(ch.seatId)
  if (!seat) return false
  const b = zone.bounds
  return (
    seat.seatCol >= b.minCol &&
    seat.seatCol <= b.maxCol &&
    seat.seatRow >= b.minRow &&
    seat.seatRow <= b.maxRow
  )
}

// ---------------------------------------------------------------------------
// Routing logic
// ---------------------------------------------------------------------------

export interface RoutingResult {
  zoneId: RoomZoneId
  waypoint: { col: number; row: number }
}

/**
 * Choose the appropriate destination zone and waypoint tile based on
 * the agent's current status and session context.
 *
 * Physics-edu override: teachers and students stay seated at their lab desks
 * so the user always sees who is in which lab. Disable all wandering — the
 * original gruai conductor wandered agents between break-room/kitchen for
 * ambient flavor, but here it just causes labels to detach from sprites
 * mid-walk and confuses the "who is in which lab" signal.
 */
export function chooseDestination(
  _ch: Character,
  _status: AgentStatus,
  _sessionInfo: SessionInfo,
  _seats?: Map<string, Seat>,
): RoutingResult | null {
  return null
}

/**
 * Pick a random waypoint from a zone.
 */
export function pickWaypoint(zoneId: RoomZoneId): RoutingResult {
  const zone = ROOM_ZONES[zoneId]
  const waypoint = zone.waypoints[Math.floor(Math.random() * zone.waypoints.length)]
  return { zoneId, waypoint }
}

/**
 * Check which zone a tile position falls within.
 * Returns the zone ID or null if not in any defined zone.
 */
export function getZoneAt(col: number, row: number): RoomZoneId | null {
  for (const zoneId of ['ceo-office', 'meeting', 'workspace', 'kitchen', 'break-room'] as RoomZoneId[]) {
    const zone = ROOM_ZONES[zoneId]
    const b = zone.bounds
    if (col >= b.minCol && col <= b.maxCol && row >= b.minRow && row <= b.maxRow) {
      return zoneId
    }
  }
  return null
}
