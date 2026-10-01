'use client';

import React from 'react';
import type { LetterBodyBlock } from '@/lib/letter-body';
import { SIGNATURE_HEIGHT, SIGNATURE_IMG, SIGNATURE_MARKER } from '@/lib/letter-signature';

/** Inline `**bold**` within a single line of wording. */
export function renderInline(line: string, key: React.Key): React.ReactNode {
  const parts = line.split(/\*\*(.+?)\*\*/g);
  return (
    <React.Fragment key={key}>
      {parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))}
    </React.Fragment>
  );
}

/** Renders one parsed wording block (heading / bullet list / stacked lines). */
export function renderLetterBlock(block: LetterBodyBlock, key: React.Key): React.ReactNode {
  if (block.kind === 'heading') {
    return (
      <h1 key={key} className="mb-1 text-center text-[15px] font-bold underline">
        {block.text}
      </h1>
    );
  }
  if (block.kind === 'list') {
    return (
      <ul key={key} className="list-disc pl-6">
        {block.items.map((item, i) => (
          <li key={i}>{renderInline(item, i)}</li>
        ))}
      </ul>
    );
  }
  return (
    <div key={key} className="space-y-1">
      {block.lines.map((line, i) =>
        line.trim() === SIGNATURE_MARKER ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={SIGNATURE_IMG}
            alt="Authorised signature"
            style={{ height: SIGNATURE_HEIGHT, display: 'block' }}
          />
        ) : (
          <p key={i} className="mb-0">
            {renderInline(line, i)}
          </p>
        ),
      )}
    </div>
  );
}
