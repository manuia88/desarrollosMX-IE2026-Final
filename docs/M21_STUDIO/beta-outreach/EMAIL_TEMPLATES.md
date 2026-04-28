# DMX Studio — Beta Outreach Email Templates

> Estado: STUB H2. Activación cuando founder tenga base 50+ asesores invitados.
> Pointer: `L-NEW-STUDIO-BETA-OUTREACH-ACTIVATE`.
> Voice profile: warm + professional + non-pushy. Founder firma como "Manu" o "Manuel Acosta".
> Cero exclamation points marketing-y. Cero emoji.
> Reglas inviolables ADR-050 aplicadas a versión React Email canon (`features/dmx-studio/lib/resend/templates/beta-*.tsx`).

## Placeholders disponibles

- `{{name}}` — nombre del asesor (ej. "María", "Carlos").
- `{{role}}` — rol/empresa (ej. "Asesora independiente", "Director Coldwell Polanco").
- `{{city}}` — ciudad (ej. "CDMX", "Monterrey", "Guadalajara").
- `{{founder_name}}` — firma founder (default "Manu").
- `{{calendly_link}}` — link agenda 30 min (founder configura H2).
- `{{checkout_link}}` — link Stripe checkout founders cohort (auto-generado per asesor).
- `{{onboarding_url}}` — link onboarding guide (`/studio/beta/onboarding`).
- `{{feedback_form_url}}` — link survey week 4 (configurable H2).

---

## Template 1 — Initial invite (ES-MX)

**Subject:** Invitación privada a la beta de DMX Studio, {{name}}

```markdown
Hola {{name}},

Soy Manu, founder de Desarrollos MX. Te escribo personalmente porque {{role}}
en {{city}} es exactamente el perfil que estamos buscando para la primera ola
de DMX Studio.

DMX Studio es un estudio de video inmobiliario con IA: voice clone propio,
Director IA que arma el guion desde 10 fotos, virtual staging, drone
simulation, y una galería pública con tu marca. Todo en un solo flujo, sin
editor, sin locutor, sin estudio.

Lo que te ofrezco si entras como beta privada:

- Acceso completo gratis durante 4 semanas.
- Soporte directo conmigo por WhatsApp para cualquier duda.
- 50% de descuento de por vida cuando salgas del beta y elijas plan.
- Tu feedback prioriza el roadmap real (no encuestas, conversaciones).

A cambio te pido tres cosas concretas:

1. Subir al menos 3 propiedades reales durante el mes.
2. 30 minutos de llamada al final para escuchar qué funcionó y qué no.
3. Honestidad — si no te sirve, lo dices y cierro tu cuenta sin fricción.

Si te interesa, responde este correo con un sí. Te mando el link de acceso
y la guía de onboarding el mismo día.

Si no es para ti, también está bien — solo respóndeme "no" y no te vuelvo
a escribir sobre esto.

Manu
Manuel Acosta
Founder, Desarrollos MX
```

**CTA:** Reply a este correo con sí/no.

---

## Template 1 — Initial invite (en-US)

**Subject:** Private beta invite to DMX Studio, {{name}}

```markdown
Hi {{name}},

I'm Manu, founder of Desarrollos MX. I'm writing personally because {{role}}
in {{city}} matches exactly the profile we're looking for in the first wave
of DMX Studio.

DMX Studio is an AI real-estate video studio: your own voice clone, an AI
Director that writes the script from 10 photos, virtual staging, drone
simulation, and a public gallery with your brand. All in one flow — no
editor, no voice actor, no studio.

What I'm offering if you join the private beta:

- Full free access for 4 weeks.
- Direct WhatsApp support with me for any question.
- 50% lifetime discount when you exit beta and pick a plan.
- Your feedback shapes the real roadmap (not surveys — conversations).

What I'm asking in return:

1. Upload at least 3 real listings during the month.
2. 30-minute call at the end so I can hear what worked and what didn't.
3. Honesty — if it doesn't work for you, say so and I'll close your account
   without friction.

If you're interested, just reply yes. I'll send the access link and
onboarding guide the same day.

If it's not for you, that's also fine — just reply "no" and I won't write
to you about this again.

Manu
Manuel Acosta
Founder, Desarrollos MX
```

**CTA:** Reply yes/no to this email.

---

## Template 2 — Follow-up day 3 (ES-MX)

**Subject:** Re: Invitación privada a la beta de DMX Studio

```markdown
Hola {{name}},

Sé que llegan muchos correos. Te dejo este recordatorio breve por si el
primero se perdió.

Sigue abierta tu invitación a la beta privada de DMX Studio. Cupo limitado
a 50 asesores en total para esta primera ola, y vamos llenando por orden
de respuesta.

Si te interesa entender qué hace antes de responder, hay un video corto
de 90 segundos que muestra el flujo real: {{onboarding_url}}

Si no es para ti, no me ofendo — solo respóndeme y cierro tu seguimiento.

Manu
```

**CTA:** Reply o link demo.

---

## Template 2 — Follow-up day 3 (en-US)

**Subject:** Re: Private beta invite to DMX Studio

```markdown
Hi {{name}},

I know you get a lot of emails. Quick reminder in case the first one got lost.

Your invite to the DMX Studio private beta is still open. Cap is 50 advisors
total for this first wave, and we're filling spots in reply order.

If you want to see what it does before replying, there's a 90-second video
that shows the real flow: {{onboarding_url}}

If it's not for you, no offense — just reply and I'll close the loop.

Manu
```

**CTA:** Reply or demo link.

---

## Template 3 — Onboarding post-acceptance (ES-MX)

**Subject:** Bienvenido a la beta de DMX Studio — guía de los primeros 3 días

```markdown
Hola {{name}},

Gracias por entrar. Aquí va la guía corta para que empieces hoy mismo:

Día 1 — Configurar cuenta
- Link de acceso: {{checkout_link}} (no se cobra durante el beta).
- Sube 5 fotos de una propiedad real para activar tu primer flujo.
- Opcional pero recomendado: graba 60 segundos de tu voz para clonarla.

Día 2 — Primer video
- Abre Director IA con la propiedad que subiste.
- Acepta el guion (o ajusta una línea si quieres).
- Descarga el MP4. Promedio: 12 minutos de trabajo activo.

Día 3 — Tu primera publicación
- Sube el video a Instagram, WhatsApp Status o tu portal.
- Mándame el link por WhatsApp +52 55 XXXX XXXX para ver cómo quedó.

Guía completa paso a paso: {{onboarding_url}}

Si te traba algo, responde este correo o WhatsApp directo. Respuesta el
mismo día.

Manu
```

**CTA:** Link checkout + guide.

---

## Template 3 — Onboarding post-acceptance (en-US)

**Subject:** Welcome to DMX Studio beta — first 3 days guide

```markdown
Hi {{name}},

Thanks for joining. Quick guide to get started today:

Day 1 — Account setup
- Access link: {{checkout_link}} (no charge during beta).
- Upload 5 photos from a real listing to trigger your first flow.
- Optional but recommended: record 60 seconds of your voice to clone it.

Day 2 — First video
- Open AI Director with the listing you uploaded.
- Accept the script (or tweak one line if you want).
- Download the MP4. Average: 12 minutes of active work.

Day 3 — Your first post
- Upload the video to Instagram, WhatsApp Status, or your portal.
- Send me the link via WhatsApp +52 55 XXXX XXXX so I can see how it came out.

Full step-by-step guide: {{onboarding_url}}

If anything blocks you, reply here or WhatsApp directly. Same-day response.

Manu
```

**CTA:** Checkout link + guide.

---

## Template 4 — Mid-week 1 check-in (ES-MX)

**Subject:** ¿Cómo va el primer video, {{name}}?

```markdown
Hola {{name}},

Llevamos 5 días desde que entraste al beta. Te escribo rápido para saber:

- ¿Pudiste subir tu primer video?
- ¿Hubo algo que te trabó? (sé honesto, eso es lo más útil para mí).
- ¿Algún feature que esperabas que esté y no encontraste?

Si te falta tiempo, no pasa nada — la beta dura 4 semanas y nadie tiene
prisa. Solo quería abrir la puerta por si necesitas algo.

Si todo bien, una respuesta de 2 líneas me sirve. Si quieres llamada de
15 min, mándame 3 horarios y agendo: {{calendly_link}}

Manu
```

**CTA:** Reply 2 líneas o calendly.

---

## Template 4 — Mid-week 1 check-in (en-US)

**Subject:** How's the first video going, {{name}}?

```markdown
Hi {{name}},

It's been 5 days since you joined the beta. Quick check-in:

- Did you manage to upload your first video?
- Anything that blocked you? (be honest — that's the most useful for me).
- Any feature you expected to find that wasn't there?

If you've been busy, no worries — the beta runs 4 weeks and nobody's in a
rush. Just opening the door in case you need something.

If all good, a 2-line reply works. If you want a 15-min call, send me 3
time slots and I'll book it: {{calendly_link}}

Manu
```

**CTA:** 2-line reply or calendly.

---

## Template 5 — End week 4 feedback (ES-MX)

**Subject:** Cierre del beta — 5 minutos de feedback, {{name}}

```markdown
Hola {{name}},

Llegamos al cierre de tu mes en el beta. Gracias por el tiempo que le
dedicaste — sin ti, este producto se construye a ciegas.

Tres formas de cerrar, elige la que te quede mejor:

1. Survey corto de 5 minutos: {{feedback_form_url}}
2. Llamada 30 min con preguntas abiertas: {{calendly_link}}
3. Audio de WhatsApp (sin script, lo que se te ocurra): +52 55 XXXX XXXX

Lo que más me sirve: qué falló, qué te sorprendió, y si lo recomendarías
a un colega — y por qué (o por qué no).

Sobre tu cuenta: queda activa con el 50% lifetime discount como acordamos.
Si decides no continuar, cero fricción — me dices y la cierro.

Gracias de verdad.

Manu
```

**CTA:** Survey OR calendly OR WhatsApp audio.

---

## Template 5 — End week 4 feedback (en-US)

**Subject:** Beta wrap-up — 5 minutes of feedback, {{name}}

```markdown
Hi {{name}},

We're at the wrap-up of your beta month. Thanks for the time you put in —
without you, this product gets built blind.

Three ways to close, pick what fits:

1. Short 5-minute survey: {{feedback_form_url}}
2. 30-min call with open questions: {{calendly_link}}
3. WhatsApp voice note (unscripted, whatever comes up): +52 55 XXXX XXXX

What helps me most: what failed, what surprised you, and whether you'd
recommend it to a colleague — and why (or why not).

About your account: it stays active with the 50% lifetime discount as
agreed. If you decide not to continue, zero friction — let me know and
I'll close it.

Thank you, truly.

Manu
```

**CTA:** Survey OR calendly OR WhatsApp voice note.

---

## Cadencia activación H2

| Day | Template | Trigger |
|-----|----------|---------|
| 0   | Template 1 — Initial invite | Manual founder per asesor en CSV |
| +3  | Template 2 — Follow-up | Auto si no reply Template 1 |
| +0 (post-accept) | Template 3 — Onboarding | Auto trigger reply "sí" |
| +5 (post-accept) | Template 4 — Check-in | Auto cron |
| +28 (post-accept) | Template 5 — Feedback | Auto cron |

## Tone validation checklist

- [x] Cero exclamation marketing-y (zero `!` en CTAs).
- [x] Cero emoji en cuerpo email (excepción: 0).
- [x] Founder firma con nombre real "Manu" / "Manuel Acosta".
- [x] Opt-out explícito en Template 1 + Template 2 ("no" cierra loop).
- [x] Honestidad sobre lo que falla (Template 4 + Template 5).
- [x] Zero pushiness ("nadie tiene prisa", "cero fricción").
- [x] WhatsApp directo founder en Templates 3, 4, 5 (high-touch beta).
