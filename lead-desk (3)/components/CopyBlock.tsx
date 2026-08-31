"use client";

export default function CopyBlock({ label, text, warn }: { label: string; text: string; warn?: boolean }) {
  return (
    <div className={`card p-4 ${warn ? "border-warn/40" : ""}`}>
      <div className="text-xs font-medium text-muted mb-2">{label}</div>
      <pre className="text-xs whitespace-pre-wrap font-sans mb-3">{text}</pre>
      <button className="btn-secondary text-xs py-1.5" onClick={() => navigator.clipboard.writeText(text)}>
        Copy
      </button>
    </div>
  );
}
