/**
 * Session calculation from presence events.
 * Time is derived from STATUS TRANSITIONS (IN_OFFICE → OUT_OF_OFFICE), not from ticks.
 */

import type { PresenceEvent, PresenceStatus } from "@prisma/client";

export interface PresenceEventLike {
  timestamp: Date;
  status: PresenceStatus;
}

export interface Session {
  start: Date;
  end: Date;
  durationMinutes: number;
}

export interface SessionResult {
  sessions: Session[];
  totalDurationMinutes: number;
}

const TRANSITION_IN: PresenceStatus = "IN_OFFICE";
const TRANSITION_OUT: PresenceStatus = "OUT_OF_OFFICE";

/**
 * Calculate sessions from a sorted (by timestamp ASC) list of events.
 * - Session starts at first IN_OFFICE after being out.
 * - Session ends at first OUT_OF_OFFICE after being in.
 * - UNKNOWN is ignored for transitions.
 * - If last state is IN_OFFICE and no event for timeout minutes, close session at min(now, lastEventTime + timeout).
 */
export function calculateSessions(
  events: PresenceEventLike[],
  now: Date,
  timeoutMinutes: number
): SessionResult {
  const sessions: Session[] = [];
  let lastIn: Date | null = null;
  let lastEventTime: Date | null = null;

  for (const event of events) {
    lastEventTime = event.timestamp;

    if (event.status === TRANSITION_IN && lastIn === null) {
      lastIn = event.timestamp;
    }

    if (event.status === TRANSITION_OUT && lastIn !== null) {
      sessions.push({
        start: lastIn,
        end: event.timestamp,
        durationMinutes: (event.timestamp.getTime() - lastIn.getTime()) / (1000 * 60),
      });
      lastIn = null;
    }
  }

  if (lastIn !== null && lastEventTime !== null) {
    const endRaw = lastEventTime.getTime() + timeoutMinutes * 60 * 1000;
    const end = new Date(Math.min(now.getTime(), endRaw));
    sessions.push({
      start: lastIn,
      end,
      durationMinutes: (end.getTime() - lastIn.getTime()) / (1000 * 60),
    });
  }

  const totalDurationMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  return { sessions, totalDurationMinutes };
}

/** Sum duration of sessions in minutes. */
export function sumDurationMinutes(sessions: Session[]): number {
  return sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
}

/**
 * Clip sessions to a time range. Sessions that span boundaries are cut to [rangeStart, rangeEnd].
 * Used for "today hours", "week hours", etc. so sessions crossing midnight are counted correctly.
 */
export function clipSessionsToRange(
  sessions: Session[],
  rangeStart: Date,
  rangeEnd: Date
): Session[] {
  const startMs = rangeStart.getTime();
  const endMs = rangeEnd.getTime();
  const result: Session[] = [];
  for (const s of sessions) {
    const sStart = s.start.getTime();
    const sEnd = s.end.getTime();
    const clipStart = Math.max(sStart, startMs);
    const clipEnd = Math.min(sEnd, endMs);
    if (clipStart < clipEnd) {
      const durationMinutes = (clipEnd - clipStart) / (1000 * 60);
      result.push({
        start: new Date(clipStart),
        end: new Date(clipEnd),
        durationMinutes,
      });
    }
  }
  return result;
}
