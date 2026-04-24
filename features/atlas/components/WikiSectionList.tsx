'use client';

// TOC automático con anchors + smooth scroll. Renderiza cada sección con
// <section id={key}> para permitir deep-linking desde la lista.

import type { MouseEvent } from 'react';
import { WikiContentRenderer } from './WikiContentRenderer';

export interface WikiSectionListSection {
  readonly key: string;
  readonly heading: string;
  readonly content_md: string;
}

export interface WikiSectionListProps {
  readonly sections: ReadonlyArray<WikiSectionListSection>;
  readonly tocLabel: string;
}

function handleAnchorClick(event: MouseEvent<HTMLAnchorElement>, key: string) {
  event.preventDefault();
  if (typeof document === 'undefined') return;
  const target = document.getElementById(`wiki-section-${key}`);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (typeof history !== 'undefined' && history.replaceState) {
    history.replaceState(null, '', `#wiki-section-${key}`);
  }
}

export function WikiSectionList({ sections, tocLabel }: WikiSectionListProps) {
  if (sections.length === 0) return null;
  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <nav aria-label={tocLabel} className="lg:sticky lg:top-24 lg:self-start">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[color:var(--color-text-secondary)]">
          {tocLabel}
        </h2>
        <ul className="space-y-2">
          {sections.map((section) => (
            <li key={section.key}>
              <a
                href={`#wiki-section-${section.key}`}
                onClick={(event) => handleAnchorClick(event, section.key)}
                className="block text-sm text-[color:var(--color-text-primary)] hover:text-[color:var(--color-accent)]"
              >
                {section.heading}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div>
        {sections.map((section) => (
          <section
            key={section.key}
            id={`wiki-section-${section.key}`}
            className="scroll-mt-24 border-b border-[color:var(--color-border)] pb-8 last:border-b-0"
          >
            <h2 className="mt-8 text-2xl font-semibold tracking-tight text-[color:var(--color-text-primary)]">
              {section.heading}
            </h2>
            <WikiContentRenderer contentMd={section.content_md} />
          </section>
        ))}
      </div>
    </div>
  );
}
