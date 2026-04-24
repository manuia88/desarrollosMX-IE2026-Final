'use client';

// Markdown renderer seguro (ADR-028).
// Pipeline: markdown → remark parse → remarkGfm → rehype-sanitize → React.
// Sanitizer usa default schema de rehype-sanitize (safe-by-default).
// Custom components aplican tokens Dopamine (styles/tokens.css).

import type { ComponentPropsWithoutRef } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

type HeadingProps = ComponentPropsWithoutRef<'h1'>;
type ParagraphProps = ComponentPropsWithoutRef<'p'>;
type AnchorProps = ComponentPropsWithoutRef<'a'>;
type ListProps = ComponentPropsWithoutRef<'ul'>;
type OrderedListProps = ComponentPropsWithoutRef<'ol'>;
type ListItemProps = ComponentPropsWithoutRef<'li'>;
type CodeProps = ComponentPropsWithoutRef<'code'>;
type PreProps = ComponentPropsWithoutRef<'pre'>;
type BlockquoteProps = ComponentPropsWithoutRef<'blockquote'>;
type TableProps = ComponentPropsWithoutRef<'table'>;

const components: Components = {
  h1: ({ children, ...rest }: HeadingProps) => (
    <h1
      className="text-3xl font-semibold tracking-tight text-[color:var(--color-text-primary)]"
      {...rest}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...rest }: HeadingProps) => (
    <h2
      className="mt-8 text-2xl font-semibold tracking-tight text-[color:var(--color-text-primary)]"
      {...rest}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...rest }: HeadingProps) => (
    <h3 className="mt-6 text-xl font-semibold text-[color:var(--color-text-primary)]" {...rest}>
      {children}
    </h3>
  ),
  h4: ({ children, ...rest }: HeadingProps) => (
    <h4 className="mt-4 text-lg font-semibold text-[color:var(--color-text-primary)]" {...rest}>
      {children}
    </h4>
  ),
  h5: ({ children, ...rest }: HeadingProps) => (
    <h5 className="mt-4 text-base font-semibold text-[color:var(--color-text-primary)]" {...rest}>
      {children}
    </h5>
  ),
  h6: ({ children, ...rest }: HeadingProps) => (
    <h6 className="mt-4 text-sm font-semibold text-[color:var(--color-text-primary)]" {...rest}>
      {children}
    </h6>
  ),
  p: ({ children, ...rest }: ParagraphProps) => (
    <p className="mt-4 leading-7 text-[color:var(--color-text-primary)]" {...rest}>
      {children}
    </p>
  ),
  a: ({ children, href, ...rest }: AnchorProps) => {
    const isExternal = typeof href === 'string' && /^https?:\/\//i.test(href);
    return (
      <a
        href={href}
        className="text-[color:var(--color-accent)] underline underline-offset-4 hover:opacity-80"
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        {...rest}
      >
        {children}
      </a>
    );
  },
  ul: ({ children, ...rest }: ListProps) => (
    <ul className="mt-4 list-disc space-y-1 pl-6" {...rest}>
      {children}
    </ul>
  ),
  ol: ({ children, ...rest }: OrderedListProps) => (
    <ol className="mt-4 list-decimal space-y-1 pl-6" {...rest}>
      {children}
    </ol>
  ),
  li: ({ children, ...rest }: ListItemProps) => (
    <li className="leading-7" {...rest}>
      {children}
    </li>
  ),
  code: ({ children, ...rest }: CodeProps) => (
    <code
      className="rounded bg-[color:var(--color-surface-muted)] px-1 py-0.5 font-mono text-sm"
      {...rest}
    >
      {children}
    </code>
  ),
  pre: ({ children, ...rest }: PreProps) => (
    <pre
      className="mt-4 overflow-x-auto rounded-lg bg-[color:var(--color-surface-muted)] p-4 font-mono text-sm"
      {...rest}
    >
      {children}
    </pre>
  ),
  blockquote: ({ children, ...rest }: BlockquoteProps) => (
    <blockquote
      className="mt-4 border-l-4 border-[color:var(--color-accent)] pl-4 italic text-[color:var(--color-text-secondary)]"
      {...rest}
    >
      {children}
    </blockquote>
  ),
  table: ({ children, ...rest }: TableProps) => (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm" {...rest}>
        {children}
      </table>
    </div>
  ),
};

export interface WikiContentRendererProps {
  readonly contentMd: string;
  readonly className?: string;
}

export function WikiContentRenderer({ contentMd, className }: WikiContentRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={components}
      >
        {contentMd}
      </ReactMarkdown>
    </div>
  );
}
