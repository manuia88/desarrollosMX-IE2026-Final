import type { z } from 'zod';
import type { comparisonTableSpecSchema } from '@/features/ia-generativa/schemas/generative-spec';

type Props = Omit<z.infer<typeof comparisonTableSpecSchema>, 'type'>;

export function ComparisonTable({ columns, rows }: Props) {
  return (
    <div className="gen-comparison-table">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowKey = row.map((cell) => String(cell)).join('|');
            return (
              <tr key={rowKey}>
                {row.map((cell, i) => {
                  const colName = columns[i] ?? `col${i}`;
                  return <td key={`${rowKey}-${colName}`}>{cell}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
