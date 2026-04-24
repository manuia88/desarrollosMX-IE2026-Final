'use client';

import { MarkdownContentRenderer } from '@/shared/ui/molecules/MarkdownContentRenderer';

export interface WikiContentRendererProps {
  readonly contentMd: string;
  readonly className?: string;
}

export function WikiContentRenderer({ contentMd, className }: WikiContentRendererProps) {
  return (
    <MarkdownContentRenderer
      content={contentMd}
      {...(className !== undefined ? { className } : {})}
    />
  );
}
