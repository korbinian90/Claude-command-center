export type ClientMessage =
  | { type: "spawn"; slug: string; cols: number; rows: number; clientId: string }
  | { type: "stdin"; sessionId: string; data: string }
  | { type: "resize"; sessionId: string; cols: number; rows: number }
  | { type: "close"; sessionId: string };

export type ServerMessage =
  | { type: "spawned"; sessionId: string; slug: string; clientId: string }
  | { type: "stdout"; sessionId: string; data: string }
  | { type: "exit"; sessionId: string; code: number }
  | { type: "error"; message: string; sessionId?: string; clientId?: string }
  | { type: "plan:updated"; slug: string }
  | { type: "goal:updated"; slug: string | null }
  | { type: "review:new"; path: string; name: string };
