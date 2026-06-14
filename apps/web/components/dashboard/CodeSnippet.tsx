"use client";

import { useState } from "react";

export function CodeSnippet({
  title,
  code,
  description,
}: {
  title: string;
  code: string;
  description?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="border border-border bg-bg-card">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-primary">
        <span className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.14em]">
          {title}
        </span>
        <button
          type="button"
          onClick={copy}
          className="font-mono text-[0.45rem] uppercase tracking-wider text-text-muted hover:text-accent-red transition-colors"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {description && (
        <p className="px-4 pt-3 font-mono text-[0.52rem] text-text-muted leading-relaxed">
          {description}
        </p>
      )}
      <pre className="px-4 py-3 font-mono text-[0.52rem] text-text-secondary overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
        {code}
      </pre>
    </div>
  );
}
