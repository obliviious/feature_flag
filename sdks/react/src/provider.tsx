import { useEffect, useMemo, useRef, useState } from "react";
import { FlagForgeClient } from "@flagforge/sdk-js";
import type { FlagsConfig } from "@flagforge/sdk-js";
import { FlagForgeContext } from "./context";
import type { FlagForgeProviderProps } from "./types";

export function FlagForgeProvider({
  config,
  onUpdate,
  onReady,
  onError,
  children,
}: FlagForgeProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  // Store user callbacks in refs so client isn't re-created on identity changes.
  const onUpdateRef = useRef(onUpdate);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  onUpdateRef.current = onUpdate;
  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  // Extract primitive deps to avoid re-creating client on object ref changes.
  const {
    serverKey,
    clientKey,
    baseUrl,
    streaming,
    pollingInterval,
    context: evalContext,
  } = config;
  const contextJson = evalContext ? JSON.stringify(evalContext) : "";

  const client = useMemo(() => {
    return new FlagForgeClient({
      ...config,
      onReady: () => {
        setIsReady(true);
        onReadyRef.current?.();
      },
      onError: (err: Error) => {
        setError(err);
        onErrorRef.current?.(err);
      },
      onUpdate: (cfg: FlagsConfig) => {
        setUpdateCount((c) => c + 1);
        onUpdateRef.current?.(cfg);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey, clientKey, baseUrl, streaming, pollingInterval, contextJson]);

  useEffect(() => {
    setIsReady(false);
    setError(null);
    setUpdateCount(0);
    client.init();

    return () => {
      client.destroy();
    };
  }, [client]);

  const contextValue = useMemo(
    () => ({ client, isReady, error, updateCount }),
    [client, isReady, error, updateCount],
  );

  return (
    <FlagForgeContext.Provider value={contextValue}>
      {children}
    </FlagForgeContext.Provider>
  );
}
