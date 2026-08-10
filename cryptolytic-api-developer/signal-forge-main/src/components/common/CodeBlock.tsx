import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface Token {
  text: string;
  kind: "plain" | "string" | "number" | "keyword" | "comment" | "punct" | "key";
}

const KEYWORDS = new Set([
  "const","let","var","await","async","function","return","if","throw","new","import","from","export",
  "package","func","defer","panic","true","false","null","None","True","False","print","echo","curl",
  "def","class","for","in","not","and","or","require","use","public","static","void","string","error",
]);

/** Tiny dependency-free tokenizer — enough for JSON and the snippet languages we emit. */
function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  const pattern =
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\/\/[^\n]*|#[^\n]*)|(-?\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|([{}[\]():,;])/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(code))) {
    if (match.index > last) tokens.push({ text: code.slice(last, match.index), kind: "plain" });
    if (match[1]) {
      const isKey = /^\s*:/.test(code.slice(pattern.lastIndex));
      tokens.push({ text: match[1], kind: isKey ? "key" : "string" });
    } else if (match[2]) tokens.push({ text: match[2], kind: "comment" });
    else if (match[3]) tokens.push({ text: match[3], kind: "number" });
    else if (match[4])
      tokens.push({ text: match[4], kind: KEYWORDS.has(match[4]) ? "keyword" : "plain" });
    else if (match[5]) tokens.push({ text: match[5], kind: "punct" });
    last = pattern.lastIndex;
  }
  if (last < code.length) tokens.push({ text: code.slice(last), kind: "plain" });
  return tokens;
}

const KIND_CLASS: Record<Token["kind"], string> = {
  plain: "text-foreground/85",
  string: "text-foreground",
  key: "text-muted-foreground",
  number: "text-foreground/95 font-medium",
  keyword: "text-subtle italic",
  comment: "text-subtle/70 italic",
  punct: "text-subtle",
};

export interface CodeBlockProps {
  code: string;
  label?: string;
  language?: string;
  className?: string;
  maxHeight?: string;
  copyable?: boolean;
}

export function CodeBlock({
  code,
  label,
  language,
  className,
  maxHeight = "26rem",
  copyable = true,
}: CodeBlockProps) {
  const tokens = useMemo(() => tokenize(code), [code]);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={cn("panel overflow-hidden", className)}>
      {(label || copyable) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <span className="mono-label truncate">{label ?? language ?? "code"}</span>
          {copyable && (
            <button
              type="button"
              onClick={copy}
              aria-label="Copy code"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              {copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
      )}
      <pre
        className="scroll-thin overflow-auto px-4 py-4 font-mono text-[12.5px] leading-relaxed"
        style={{ maxHeight }}
      >
        <code>
          {tokens.map((token, index) => (
            <span key={index} className={KIND_CLASS[token.kind]}>
              {token.text}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
