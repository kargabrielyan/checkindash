import { describe, it, expect } from "vitest";
import {
  calculateSessions,
  clipSessionsToRange,
  sumDurationMinutes,
} from "./presence-service";
import type { PresenceEventLike, Session } from "./presence-service";

function ev(ts: string, status: "IN_OFFICE" | "OUT_OF_OFFICE" | "UNKNOWN"): PresenceEventLike {
  return { timestamp: new Date(ts), status };
}

describe("calculateSessions", () => {
  const timeoutMinutes = 30;

  it("returns empty sessions when no events", () => {
    const now = new Date("2025-02-17T18:00:00Z");
    const result = calculateSessions([], now, timeoutMinutes);
    expect(result.sessions).toHaveLength(0);
    expect(result.totalDurationMinutes).toBe(0);
  });

  it("single IN then OUT creates one session", () => {
    const events = [
      ev("2025-02-17T09:00:00Z", "IN_OFFICE"),
      ev("2025-02-17T17:00:00Z", "OUT_OF_OFFICE"),
    ];
    const now = new Date("2025-02-17T18:00:00Z");
    const result = calculateSessions(events, now, timeoutMinutes);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].start.toISOString()).toBe("2025-02-17T09:00:00.000Z");
    expect(result.sessions[0].end.toISOString()).toBe("2025-02-17T17:00:00.000Z");
    expect(result.sessions[0].durationMinutes).toBe(8 * 60);
    expect(result.totalDurationMinutes).toBe(8 * 60);
  });

  it("missing OUT: closes session at lastEvent + timeout (never beyond now)", () => {
    const events = [
      ev("2025-02-17T09:00:00Z", "IN_OFFICE"),
      ev("2025-02-17T10:00:00Z", "IN_OFFICE"), // duplicate IN ignored for new session
    ];
    const now = new Date("2025-02-17T10:15:00Z"); // 15 min after last event
    const result = calculateSessions(events, now, timeoutMinutes);
    expect(result.sessions).toHaveLength(1);
    // end = min(now, lastEvent + 30min) = min(10:15, 10:30) = 10:15
    expect(result.sessions[0].end.toISOString()).toBe("2025-02-17T10:15:00.000Z");
    expect(result.sessions[0].durationMinutes).toBe(75); // 9:00 to 10:15
  });

  it("missing OUT: session ends at now when timeout would be past now", () => {
    const events = [ev("2025-02-17T09:00:00Z", "IN_OFFICE")];
    const now = new Date("2025-02-17T09:20:00Z");
    const result = calculateSessions(events, now, timeoutMinutes);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].end.toISOString()).toBe("2025-02-17T09:20:00.000Z");
    expect(result.sessions[0].durationMinutes).toBe(20);
  });

  it("UNKNOWN does not start or end session", () => {
    const events = [
      ev("2025-02-17T09:00:00Z", "UNKNOWN"),
      ev("2025-02-17T09:30:00Z", "IN_OFFICE"),
      ev("2025-02-17T10:00:00Z", "UNKNOWN"),
      ev("2025-02-17T17:00:00Z", "OUT_OF_OFFICE"),
    ];
    const now = new Date("2025-02-17T18:00:00Z");
    const result = calculateSessions(events, now, timeoutMinutes);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].start.toISOString()).toBe("2025-02-17T09:30:00.000Z");
    expect(result.sessions[0].end.toISOString()).toBe("2025-02-17T17:00:00.000Z");
    expect(result.sessions[0].durationMinutes).toBe(7.5 * 60);
  });

  it("multiple IN/OUT pairs create multiple sessions", () => {
    const events = [
      ev("2025-02-17T09:00:00Z", "IN_OFFICE"),
      ev("2025-02-17T12:00:00Z", "OUT_OF_OFFICE"),
      ev("2025-02-17T13:00:00Z", "IN_OFFICE"),
      ev("2025-02-17T17:00:00Z", "OUT_OF_OFFICE"),
    ];
    const now = new Date("2025-02-17T18:00:00Z");
    const result = calculateSessions(events, now, timeoutMinutes);
    expect(result.sessions).toHaveLength(2);
    expect(result.sessions[0].durationMinutes).toBe(3 * 60);
    expect(result.sessions[1].durationMinutes).toBe(4 * 60);
    expect(result.totalDurationMinutes).toBe(7 * 60);
  });

  it("missing IN: OUT without prior IN does not create session", () => {
    const events = [ev("2025-02-17T17:00:00Z", "OUT_OF_OFFICE")];
    const now = new Date("2025-02-17T18:00:00Z");
    const result = calculateSessions(events, now, timeoutMinutes);
    expect(result.sessions).toHaveLength(0);
    expect(result.totalDurationMinutes).toBe(0);
  });
});

describe("clipSessionsToRange", () => {
  it("clips session spanning midnight: only part inside range counts", () => {
    const sessions: Session[] = [
      {
        start: new Date("2025-02-16T23:50:00Z"),
        end: new Date("2025-02-17T00:20:00Z"),
        durationMinutes: 30,
      },
    ];
    const todayStart = new Date("2025-02-17T00:00:00Z");
    const todayEnd = new Date("2025-02-17T23:59:59.999Z");
    const clipped = clipSessionsToRange(sessions, todayStart, todayEnd);
    expect(clipped).toHaveLength(1);
    expect(clipped[0].start.toISOString()).toBe("2025-02-17T00:00:00.000Z");
    expect(clipped[0].end.toISOString()).toBe("2025-02-17T00:20:00.000Z");
    expect(clipped[0].durationMinutes).toBe(20);
  });

  it("returns empty when session is entirely before range", () => {
    const sessions: Session[] = [
      {
        start: new Date("2025-02-16T09:00:00Z"),
        end: new Date("2025-02-16T17:00:00Z"),
        durationMinutes: 480,
      },
    ];
    const rangeStart = new Date("2025-02-17T00:00:00Z");
    const rangeEnd = new Date("2025-02-17T23:59:59.999Z");
    const clipped = clipSessionsToRange(sessions, rangeStart, rangeEnd);
    expect(clipped).toHaveLength(0);
  });

  it("returns full session when entirely inside range", () => {
    const sessions: Session[] = [
      {
        start: new Date("2025-02-17T09:00:00Z"),
        end: new Date("2025-02-17T17:00:00Z"),
        durationMinutes: 480,
      },
    ];
    const rangeStart = new Date("2025-02-17T00:00:00Z");
    const rangeEnd = new Date("2025-02-17T23:59:59.999Z");
    const clipped = clipSessionsToRange(sessions, rangeStart, rangeEnd);
    expect(clipped).toHaveLength(1);
    expect(clipped[0].durationMinutes).toBe(480);
  });
});

describe("sumDurationMinutes", () => {
  it("sums session durations", () => {
    const sessions: Session[] = [
      { start: new Date(0), end: new Date(60 * 60 * 1000), durationMinutes: 60 },
      { start: new Date(0), end: new Date(30 * 60 * 1000), durationMinutes: 30 },
    ];
    expect(sumDurationMinutes(sessions)).toBe(90);
  });
  it("returns 0 for empty", () => {
    expect(sumDurationMinutes([])).toBe(0);
  });
});

describe("integration: today hours with session spanning midnight", () => {
  const timeoutMinutes = 30;

  it("user checked in yesterday 23:50, checked out today 00:20 => today hours = 20 min", () => {
    const events: PresenceEventLike[] = [
      ev("2025-02-16T23:50:00Z", "IN_OFFICE"),
      ev("2025-02-17T00:20:00Z", "OUT_OF_OFFICE"),
    ];
    const now = new Date("2025-02-17T09:00:00Z");
    const todayStart = new Date("2025-02-17T00:00:00Z");
    const { sessions } = calculateSessions(events, now, timeoutMinutes);
    const clipped = clipSessionsToRange(sessions, todayStart, now);
    const total = sumDurationMinutes(clipped);
    expect(total).toBe(20);
  });
});

describe("current status: stale IN_OFFICE after timeout", () => {
  const timeoutMinutes = 30;

  it("last IN_OFFICE yesterday 23:50, now today 09:00 => treated as OUT (stale)", () => {
    const events: PresenceEventLike[] = [
      ev("2025-02-16T23:50:00Z", "IN_OFFICE"),
    ];
    const now = new Date("2025-02-17T09:00:00Z");
    const { sessions } = calculateSessions(events, now, timeoutMinutes);
    const lastSession = sessions[sessions.length - 1];
    const cutoff = now.getTime() - timeoutMinutes * 60 * 1000;
    const isCurrentlyIn = lastSession && lastSession.end.getTime() >= cutoff;
    expect(isCurrentlyIn).toBe(false);
  });
});
