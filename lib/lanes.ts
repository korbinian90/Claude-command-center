export const LANES = ["Active", "Executing", "Review", "Done"] as const;
export type Lane = (typeof LANES)[number];
