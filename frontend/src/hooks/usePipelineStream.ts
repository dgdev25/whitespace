import { useEffect, useRef, useState } from "react";

export interface PipelineStep {
  step: string;
  message: string;
  status: "running" | "done" | "error";
  ts: string;
}

export function usePipelineStream(active: boolean) {
  const [steps, setSteps] = useState<Map<string, PipelineStep>>(new Map());
  const esRef = useRef<EventSource | null>(null);
  const resetOnNextEvent = useRef(false);

  useEffect(() => {
    if (!active) return;

    // The first event of a new stream replaces prior-run progress.
    resetOnNextEvent.current = true;

    const es = new EventSource("/api/system/pipeline/stream");
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const event: PipelineStep = JSON.parse(e.data);
        setSteps((prev) => {
          const next = resetOnNextEvent.current ? new Map<string, PipelineStep>() : new Map(prev);
          resetOnNextEvent.current = false;
          next.set(event.step, event);
          return next;
        });
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [active]);

  return Array.from(steps.values());
}
