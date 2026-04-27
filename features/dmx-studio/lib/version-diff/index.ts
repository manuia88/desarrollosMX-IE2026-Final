// FASE 14.F.4 Sprint 3 — Time Machine version diff (zero deps).
// Pure function: tokenize 2 strings by whitespace and emit per-token
// segments tagged added/removed/unchanged. Deterministic LCS computed
// over tokens; quadratic time. Used by VersionDiffViewer.

export type DiffSegmentKind = 'added' | 'removed' | 'unchanged';

export interface DiffSegment {
  readonly kind: DiffSegmentKind;
  readonly value: string;
}

export interface SimpleLineDiffResult {
  readonly left: ReadonlyArray<DiffSegment>;
  readonly right: ReadonlyArray<DiffSegment>;
  readonly addedCount: number;
  readonly removedCount: number;
  readonly unchangedCount: number;
}

function tokenize(input: string): ReadonlyArray<string> {
  if (input.length === 0) return [];
  // Keep whitespace runs as their own tokens for visual fidelity.
  const matches = input.match(/\S+|\s+/g);
  return matches ?? [];
}

function lcsTable(
  a: ReadonlyArray<string>,
  b: ReadonlyArray<string>,
): ReadonlyArray<ReadonlyArray<number>> {
  const m = a.length;
  const n = b.length;
  const table: number[][] = [];
  for (let i = 0; i <= m; i += 1) {
    const row: number[] = new Array(n + 1).fill(0);
    table.push(row);
  }
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const rowI = table[i];
      const rowPrev = table[i - 1];
      if (!rowI || !rowPrev) continue;
      if (a[i - 1] === b[j - 1]) {
        rowI[j] = (rowPrev[j - 1] ?? 0) + 1;
      } else {
        const up = rowPrev[j] ?? 0;
        const left = rowI[j - 1] ?? 0;
        rowI[j] = up >= left ? up : left;
      }
    }
  }
  return table;
}

export function simpleLineDiff(a: string, b: string): SimpleLineDiffResult {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  const table = lcsTable(tokensA, tokensB);

  const left: DiffSegment[] = [];
  const right: DiffSegment[] = [];
  let addedCount = 0;
  let removedCount = 0;
  let unchangedCount = 0;

  let i = tokensA.length;
  let j = tokensB.length;
  // Walk back from bottom-right collecting moves; push to fronts.
  while (i > 0 && j > 0) {
    const tokA = tokensA[i - 1];
    const tokB = tokensB[j - 1];
    if (tokA !== undefined && tokB !== undefined && tokA === tokB) {
      left.unshift({ kind: 'unchanged', value: tokA });
      right.unshift({ kind: 'unchanged', value: tokB });
      unchangedCount += 1;
      i -= 1;
      j -= 1;
      continue;
    }
    const rowI = table[i];
    const rowPrev = table[i - 1];
    const up = rowPrev ? (rowPrev[j] ?? 0) : 0;
    const leftCell = rowI ? (rowI[j - 1] ?? 0) : 0;
    if (up >= leftCell) {
      // removal: token in A absent in B
      if (tokA !== undefined) {
        left.unshift({ kind: 'removed', value: tokA });
        removedCount += 1;
      }
      i -= 1;
    } else {
      if (tokB !== undefined) {
        right.unshift({ kind: 'added', value: tokB });
        addedCount += 1;
      }
      j -= 1;
    }
  }
  while (i > 0) {
    const tokA = tokensA[i - 1];
    if (tokA !== undefined) {
      left.unshift({ kind: 'removed', value: tokA });
      removedCount += 1;
    }
    i -= 1;
  }
  while (j > 0) {
    const tokB = tokensB[j - 1];
    if (tokB !== undefined) {
      right.unshift({ kind: 'added', value: tokB });
      addedCount += 1;
    }
    j -= 1;
  }

  return {
    left,
    right,
    addedCount,
    removedCount,
    unchangedCount,
  };
}
