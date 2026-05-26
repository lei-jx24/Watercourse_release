import { useEffect } from "react";

export function useDebouncedEffect(effect: () => void, dependencies: unknown[], delay: number): void {
  useEffect(() => {
    const timeout = window.setTimeout(effect, delay);

    return () => {
      window.clearTimeout(timeout);
    };
  }, dependencies);
}
