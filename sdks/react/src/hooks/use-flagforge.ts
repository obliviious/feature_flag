import { useContext } from "react";
import { FlagForgeContext } from "../context";
import type { FlagForgeContextValue } from "../types";

/** Access the FlagForge client and state directly. */
export function useFlagForge(): FlagForgeContextValue {
  const ctx = useContext(FlagForgeContext);
  if (!ctx) {
    throw new Error(
      "useFlagForge must be used within a <FlagForgeProvider>",
    );
  }
  return ctx;
}
