import React, { useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { taskUrl } from "@/entities/task";

interface CopyTaskLinkProps {
  projectId: number;
  taskId: number;
}

type CopyState = "idle" | "copied" | "failed";

/** "Copy link" button for a task. Falls back to showing the URL if the clipboard isn't available. */
export const CopyTaskLink: React.FC<CopyTaskLinkProps> = ({ projectId, taskId }) => {
  const [state, setState] = useState<CopyState>("idle");
  const url = taskUrl(projectId, taskId);

  // Reset the "Copied!" message after a moment.
  useEffect(() => {
    if (state !== "copied") return;
    const timer = window.setTimeout(() => setState("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    try {
      // navigator.clipboard is only available on secure origins (https or localhost).
      if (!navigator.clipboard) throw new Error("Clipboard not available");
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("failed");
    }
  };

  return (
    <span className="copy-link">
      <Button variant="secondary" onClick={copy}>
        {state === "copied" ? "Link copied!" : "Copy link"}
      </Button>
      <span className="copy-link-status" role="status">
        {state === "failed" && (
          <>
            Couldn't copy automatically. Link:{" "}
            <input aria-label="Task link" readOnly value={url} onFocus={(e) => e.target.select()} />
          </>
        )}
      </span>
    </span>
  );
};

