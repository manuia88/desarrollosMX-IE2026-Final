import { z } from 'zod';

export const mfaVerifyInputSchema = z.object({
  factor_id: z.string().uuid(),
  challenge_id: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/, { message: 'mfa_code_invalid' }),
});

export type MfaVerifyInput = z.infer<typeof mfaVerifyInputSchema>;

export const mfaBackupCodeInputSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{8}$/i, { message: 'mfa_backup_code_invalid' }),
});

export type MfaBackupCodeInput = z.infer<typeof mfaBackupCodeInputSchema>;
