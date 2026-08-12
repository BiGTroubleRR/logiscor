// Fills the RFQ email subject/body from the i18n `rfq` dict (src/lib/i18n/en.ts + cs.ts) — the
// wording itself lives there, this file just assembles it around the route context, same
// division of labor as every other i18n-driven string in the app.
import type { Dict } from '@/lib/i18n/en';

export type RfqContext = {
  originText?: string;
  destText?: string;
  cargoType?: string;
};

export function buildRfqSubject(t: Dict['rfq']): string {
  return t.defaultSubject;
}

export function buildRfqBody(t: Dict['rfq'], ctx: RfqContext): string {
  const lines: string[] = [t.greeting, ''];
  if (ctx.originText && ctx.destText) {
    lines.push(t.bodyIntro, t.routeLine(ctx.originText, ctx.destText));
  } else {
    lines.push(t.bodyIntroGeneric);
  }
  if (ctx.cargoType) lines.push(t.cargoLine(ctx.cargoType));
  lines.push('', t.closing);
  return lines.join('\n');
}
