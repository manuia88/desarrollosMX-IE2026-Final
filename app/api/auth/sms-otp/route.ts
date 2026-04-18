import { NextResponse } from 'next/server';

// TODO FASE 22: integrar Twilio SMS para MFA fallback cuando usuario no tiene authenticator.
// Requiere cuenta Twilio + número origen verificado por país + env TWILIO_* secrets.
// Generación de OTP 6 dígitos con TTL 5 min persistido en profiles.meta.last_sms_otp_hash.
export async function POST() {
  return NextResponse.json(
    { error: 'not_implemented', reason: 'sms_mfa_fallback_pending_fase_22' },
    { status: 501 },
  );
}
