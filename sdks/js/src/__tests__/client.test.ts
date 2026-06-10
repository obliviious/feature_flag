import { describe, expect, it } from "vitest";
import { parseSSE } from "../client";

describe("parseSSE", () => {
  it("parses a single config event", () => {
    const buffer =
      'event: config\ndata: {"version":1,"flags":{},"segments":{}}\n\n';
    const { events, remaining } = parseSSE(buffer);

    expect(events).toEqual([
      {
        type: "config",
        data: '{"version":1,"flags":{},"segments":{}}',
      },
    ]);
    expect(remaining).toBe("");
  });

  it("parses config_delta events", () => {
    const buffer =
      'event: config_delta\ndata: {"seq":7,"from_version":1,"to_version":2,"changed_flags":{},"deleted_flags":[]}\n\n';
    const { events } = parseSSE(buffer);

    expect(events[0]?.type).toBe("config_delta");
    expect(JSON.parse(events[0]!.data).seq).toBe(7);
  });

  it("keeps incomplete events in the remainder buffer", () => {
    const partial = 'event: config\ndata: {"version":';
    const { events, remaining } = parseSSE(partial);

    expect(events).toEqual([]);
    expect(remaining).toBe(partial);
  });

  it("skips SSE comment keepalive lines", () => {
    const buffer = ": keepalive\n\n";
    const { events } = parseSSE(buffer);
    expect(events).toEqual([]);
  });
});
