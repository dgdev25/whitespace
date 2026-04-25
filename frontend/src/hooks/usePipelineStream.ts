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

  useEffect(() => {
    if (!active) return;

    // Reset steps for the new run
    setSteps(new Map());

    const es = new EventSource("/api/system/pipeline/stream");
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const event: PipelineStep = JSON.parse(e.data);
        setSteps((prev) => {
          const next = new Map(prev);
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
