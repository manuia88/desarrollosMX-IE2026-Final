'use client';

// F14.F.8 Sprint 7 BIBLIA Upgrade 4 — Analytics export PDF button.

import { trpc } from '@/shared/lib/trpc/client';
import { Button } from '@/shared/ui/primitives/canon';

interface Props {
  readonly monthsBack: number;
}

export function ExportPdfButton({ monthsBack }: Props) {
  const exportMutation = trpc.studio.sprint7Analytics.exportPdf.useMutation();

  function handleClick() {
    exportMutation.mutate(
      { monthsBack },
      {
        onSuccess: (data) => {
          if (typeof window === 'undefined') return;
          const binary = atob(data.base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `analytics-dmx-studio-${new Date().toISOString().slice(0, 10)}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        },
      },
    );
  }

  return (
    <Button
      variant="primary"
      size="sm"
      onClick={handleClick}
      disabled={exportMutation.isPending}
      aria-label="Exportar reporte PDF"
    >
      {exportMutation.isPending ? 'Generando…' : 'Exportar reporte PDF'}
    </Button>
  );
}
