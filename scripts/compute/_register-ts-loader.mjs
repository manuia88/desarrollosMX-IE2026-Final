// Registro del resolver hook para que Node ESM resuelva bare `.ts` imports
// al ejecutar scripts CLI compute bajo --experimental-strip-types.
// Ver _ts-resolver.mjs para detalle.

import { register } from 'node:module';

register('./_ts-resolver.mjs', import.meta.url);
