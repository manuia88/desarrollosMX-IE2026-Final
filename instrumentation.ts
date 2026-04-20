// Next.js 16 instrumentation hook — llamado una vez al startup server.
// Wire IE calculator registry (TODO #15) para que worker cron pueda invocar
// runScore('F01', ...) sin error 'calculator_not_loaded'.

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const [{ registerN0Calculators }, { registerN01ToN11Calculators }, { registerN1Calculators }] =
    await Promise.all([
      import('@/shared/lib/intelligence-engine/calculators/n0'),
      import('@/shared/lib/intelligence-engine/calculators/n01-n11'),
      import('@/shared/lib/intelligence-engine/calculators/n1'),
    ]);
  registerN0Calculators();
  registerN01ToN11Calculators();
  registerN1Calculators();
}
