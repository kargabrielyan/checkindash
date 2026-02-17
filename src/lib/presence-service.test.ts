import { describe, it, expect } from "vitest";
import { calculateSessions } from "./presence-service";
import type { PresenceEventLike } from "./presence-service";

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
