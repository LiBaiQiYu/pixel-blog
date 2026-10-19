import React, { useState } from 'react';
import { Check, Copy, Sparkles } from 'lucide-react';

export interface TocItem {
  id: string;
  level: 1 | 2 | 3;
  text: string;
}

// Extract headings (#, ##, ###) outside of fenced code blocks for TOC navigation
export function extractMarkdownToc(markdown: string): TocItem[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const toc: TocItem[] = [];
  let inCodeBlock = false;
  let headingCounter = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = /^(#{1,3})\s+(.+)$/.exec(line);
    if (match) {
      const level = match[1].length as 1 | 2 | 3;
      const text = match[2].replace(/[*_`~]/g, '').trim();
      toc.push({
        id: `md-heading-${headingCounter++}`,
        level,
        text,
      });
    }
  }
  return toc;
}

// Strip Markdown syntax to generate a clean plain-text excerpt
export function extractMarkdownExcerpt(markdown: string, maxLen = 120): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let inCode = false;
  const plainLines: string[] = [];

  for (const raw of lines) {
    const t = raw.trim();
    if (t.startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (
      inCode ||
      !t ||
      t.startsWith('#') ||
      t.startsWith('>') ||
      t.startsWith('|') ||
      t.startsWith('---')
    ) {
      continue;
    }
    const cleaned = t
      .replace(/^[-*+]\s+/, '')
      .replace(/^\d+\.\s+/, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_`~]/g, '');
    if (cleaned) plainLines.push(cleaned);
    if (plainLines.join(' ').length >= maxLen) break;
  }

  const joined = plainLines.join(' ').trim();
  if (!joined) return '标准化 Markdown 像素笔记归档。';
  return joined.length > maxLen ? `${joined.slice(0, maxLen)}...` : joined;
}

// Parse inline Markdown: **bold**, *italic*, `code`, ~~strike~~, [link](url)
function renderInlineMarkdown(text: string): React.ReactNode[] {
  const tokenRegex =
    /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded text-[0.88em] font-mono bg-sky-500/15 dark:bg-cyan-400/15 text-sky-700 dark:text-cyan-300 border border-sky-400/25"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong
          key={idx}
          className="font-bold text-slate-900 dark:text-white"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={idx} className="italic text-sky-700 dark:text-cyan-200">
          {part.slice(1, -1)}
        </em>
      );
    }

    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      return (
        <del key={idx} className="line-through opacity-65">
          {part.slice(2, -2)}
        </del>
      );
    }

    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (linkMatch) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-sky-400 text-sky-600 dark:text-cyan-300 hover:text-pink-500 transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

interface MarkdownRendererProps {
  content: string;
  variant?: 'gui' | 'terminal';
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  variant = 'gui',
}) => {
  const [copiedBlock, setCopiedBlock] = useState<number | null>(null);

  const handleCopy = (code: string, blockId: number) => {
    navigator.clipboard.writeText(code);
    setCopiedBlock(blockId);
    setTimeout(() => setCopiedBlock(null), 1800);
  };

  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];

  let i = 0;
  let headingCounter = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 1. Fenced Code Block: ```lang:filename or ```lang
    if (trimmed.startsWith('```')) {
      const meta = trimmed.slice(3).trim();
      const [langPart, filePart] = meta.split(':');
      const language = langPart?.trim() || 'text';
      const filename =
        filePart?.trim() || (language !== 'text' ? `snippet.${language}` : 'code.txt');

      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```

      const codeStr = codeLines.join('\n');
      const currentBlockId = blockKey++;

      blocks.push(
        <div
          key={`code-${currentBlockId}`}
          className="rounded-xl overflow-hidden border border-slate-300/80 dark:border-white/15 bg-slate-900 text-slate-100 shadow-lg my-4"
        >
          <div className="px-4 py-2 bg-slate-950/90 border-b border-white/10 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-rose-500 inline-block" />
              <span className="w-2.5 h-2.5 bg-amber-400 inline-block" />
              <span className="w-2.5 h-2.5 bg-emerald-400 inline-block" />
              <span className="ml-2 text-cyan-300 font-semibold">{filename}</span>
              <span className="px-1.5 py-0.2 rounded bg-white/10 text-[10px] text-slate-300 uppercase">
                {language}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(codeStr, currentBlockId)}
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
            >
              {copiedBlock === currentBlockId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPY</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 text-xs sm:text-sm font-mono overflow-x-auto leading-relaxed text-cyan-100">
            <code>{codeStr}</code>
          </pre>
        </div>
      );
      continue;
    }

    // 2. Horizontal Rule: --- or ***
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      blocks.push(
        <div
          key={`hr-${blockKey++}`}
          className="my-6 flex items-center gap-2 opacity-60"
        >
          <span className="w-2 h-2 bg-sky-400 inline-block" />
          <div className="flex-1 h-[1px] bg-gradient-to-r from-sky-400/50 via-pink-400/50 to-transparent" />
        </div>
      );
      i++;
      continue;
    }

    // 3. Headings: #, ##, ###
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      const text = headingMatch[2].trim();
      const id = `md-heading-${headingCounter++}`;

      if (level === 1) {
        blocks.push(
          <h1
            key={`h1-${blockKey++}`}
            id={id}
            className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white pt-4 pb-2 border-b border-slate-200/60 dark:border-white/10 scroll-mt-32"
          >
            {renderInlineMarkdown(text)}
          </h1>
        );
      } else if (level === 2) {
        blocks.push(
          <h2
            key={`h2-${blockKey++}`}
            id={id}
            className={`text-base sm:text-xl font-bold font-mono pt-3 flex items-center gap-2.5 scroll-mt-32 ${
              variant === 'terminal'
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-slate-900 dark:text-white'
            }`}
          >
            <span
              className={`inline-block w-2.5 h-2.5 shrink-0 ${
                variant === 'terminal'
                  ? 'bg-emerald-500 shadow-[3px_3px_0_0_rgba(56,189,248,0.6)]'
                  : 'bg-sky-500 dark:bg-cyan-400 shadow-[3px_3px_0_0_rgba(244,114,182,0.7)]'
              }`}
            />
            <span>{renderInlineMarkdown(text)}</span>
          </h2>
        );
      } else {
        blocks.push(
          <h3
            key={`h3-${blockKey++}`}
            id={id}
            className="text-sm sm:text-base font-bold font-mono text-sky-700 dark:text-cyan-300 pt-2 scroll-mt-32"
          >
            ### {renderInlineMarkdown(text)}
          </h3>
        );
      }
      i++;
      continue;
    }

    // 4. Blockquote / Pixel Tip: > ...
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      const quoteText = quoteLines.join(' ');
      blocks.push(
        <blockquote
          key={`quote-${blockKey++}`}
          className="p-4 rounded-xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-sky-500/10 border border-pink-400/35 flex items-start gap-3 my-3"
        >
          <Sparkles className="w-4 h-4 text-pink-500 shrink-0 mt-1" />
          <div className="text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200 leading-relaxed">
            {renderInlineMarkdown(quoteText)}
          </div>
        </blockquote>
      );
      continue;
    }

    // 5. Markdown Table: | col1 | col2 |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableRows: string[][] = [];
      while (
        i < lines.length &&
        lines[i].trim().startsWith('|') &&
        lines[i].trim().endsWith('|')
      ) {
        const rowLine = lines[i].trim();
        // Skip separator row like |---|---|
        if (!/^\|[\s\-:|]+\|$/.test(rowLine)) {
          const cells = rowLine
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim());
          tableRows.push(cells);
        }
        i++;
      }
      if (tableRows.length > 0) {
        const [headerRow, ...bodyRows] = tableRows;
        blocks.push(
          <div
            key={`table-${blockKey++}`}
            className="my-4 overflow-x-auto rounded-xl border border-slate-300/70 dark:border-white/15 bg-white/40 dark:bg-slate-950/50"
          >
            <table className="w-full text-left border-collapse text-xs sm:text-sm font-mono">
              <thead>
                <tr className="border-b border-slate-300/60 dark:border-white/15 bg-slate-200/60 dark:bg-slate-900/80 text-sky-700 dark:text-cyan-300">
                  {headerRow.map((cell, cIdx) => (
                    <th key={cIdx} className="px-3.5 py-2 font-bold">
                      {renderInlineMarkdown(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-white/10">
                {bodyRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-sky-500/10 transition-colors"
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-3.5 py-2 text-slate-700 dark:text-slate-300"
                      >
                        {renderInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // 6. Unordered List: - item or * item
    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul
          key={`ul-${blockKey++}`}
          className="space-y-2 my-3 pl-2 text-sm sm:text-base text-slate-700 dark:text-slate-300"
        >
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
              <span className="w-1.5 h-1.5 bg-sky-500 dark:bg-cyan-400 mt-2.5 shrink-0" />
              <span>{renderInlineMarkdown(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 7. Ordered List: 1. item
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol
          key={`ol-${blockKey++}`}
          className="space-y-2 my-3 pl-1 text-sm sm:text-base text-slate-700 dark:text-slate-300"
        >
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
              <span className="font-mono text-xs font-bold text-sky-600 dark:text-cyan-400 mt-1 shrink-0">
                0{idx + 1}.
              </span>
              <span>{renderInlineMarkdown(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 8. Standard Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('>') &&
      !lines[i].trim().startsWith('|') &&
      !/^[-*+]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^(-{3,}|\*{3,})$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }

    blocks.push(
      <p
        key={`p-${blockKey++}`}
        className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-7"
      >
        {paraLines.map((line, lIdx) => (
          <React.Fragment key={lIdx}>
            {lIdx > 0 && <br />}
            {renderInlineMarkdown(line)}
          </React.Fragment>
        ))}
      </p>
    );
  }

  return <div className="space-y-4">{blocks}</div>;
};
