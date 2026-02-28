import { createContext } from "react";
import type { FlagForgeContextValue } from "./types";

export const FlagForgeContext = createContext<FlagForgeContextValue | null>(
  null,
);
