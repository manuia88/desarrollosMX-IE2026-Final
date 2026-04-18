import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(12, { message: 'password_too_short' })
  .regex(/[a-z]/, { message: 'password_needs_lowercase' })
  .regex(/[A-Z]/, { message: 'password_needs_uppercase' })
  .regex(/\d/, { message: 'password_needs_digit' })
  .regex(/[^A-Za-z0-9]/, { message: 'password_needs_symbol' });

export const emailSchema = z.string().trim().email();

export const signupInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  country_code: z.enum(['MX', 'CO', 'AR', 'BR', 'CL', 'US']),
  preferred_locale: z.enum(['es-MX', 'es-CO', 'es-AR', 'pt-BR', 'es-CL', 'en-US']),
  accept_tos: z.literal(true),
});

export type SignupInput = z.infer<typeof signupInputSchema>;

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginInputSchema>;
