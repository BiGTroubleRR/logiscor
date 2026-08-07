// One-time seed: imports scripts/data/carriers-data.js (535 records as of this writing — the
// design handoff's README said 286, but the actual file has more) into the `companies` table.
// Run once, after supabase/schema.sql has been applied:
//   node --env-file=.env.local scripts/seed-companies.mjs
//
// Uses the service-role key (RLS has no anon/authenticated policies — see schema.sql) and
// upserts on id, so it's safe to re-run after adding more source records later; it will NOT
// overwrite fields staff have since edited in the app, because it only upserts rows that don't
// already exist (see the "existing ids" skip below).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — run with --env-file=.env.local');
  process.exit(1);
}
const supabase = createClient(url, serviceKey);

const VALID_MULDA = new Set(['YES', 'Most likely', 'No', 'Does not state']);
const VALID_TYPES = new Set(['carrier', 'manufacturer', 'port', 'warehouse']);

function loadRawLocations() {
  const raw = readFileSync(join(__dirname, 'data', 'carriers-data.js'), 'utf8');
  const jsonText = raw.replace(/^window\.RAW_LOCATIONS\s*=\s*/, '').replace(/;\s*$/, '');
  return JSON.parse(jsonText);
}

function toCompanyRow(r) {
  const industries = r.industries ?? '';
  return {
    id: r.id,
    type: VALID_TYPES.has(r.type) ? r.type : 'carrier',
    name: r.name,
    country: r.country ?? '',
    region: r.region ?? '',
    city: r.city ?? '',
    lat: r.lat,
    lng: r.lng,
    industries,
    lanes: r.lanes ?? '',
    // Matches the prototype's actual loadBaseCarriers behavior: capability tags are parsed
    // from `industries` only, not `lanes`, despite the README mentioning "industries/lanes".
    capability_tags: industries ? industries.split(';').map((t) => t.trim()).filter(Boolean) : [],
    mulda_presence: VALID_MULDA.has(r.mulda_presence) ? r.mulda_presence : 'Does not state',
    // Dropped: the "nearest anchor" distance from the source data isn't useful, so never carry it over.
    distance_km: null,
    distance_anchor: '',
    description: r.description ?? '',
    website: r.website ?? '',
    email: r.email ?? '',
    phone: r.phone ?? '',
    source: r.source ?? '',
    source_url: r.source_url ?? '',
    pending_review: r.pending_review ?? true,
    strength_score: null,
    strength_rationale: '',
    duplicate_dismissed: false,
    created_at: r.created_at ?? new Date().toISOString().slice(0, 10),
    updated_at: r.updated_at ?? new Date().toISOString().slice(0, 10),
  };
}

async function main() {
  const raw = loadRawLocations();
  console.log(`Parsed ${raw.length} source records.`);

  const { data: existing, error: existingError } = await supabase.from('companies').select('id');
  if (existingError) throw existingError;
  const existingIds = new Set((existing ?? []).map((r) => r.id));

  const toInsert = raw.filter((r) => !existingIds.has(r.id)).map(toCompanyRow);
  console.log(`${existingIds.size} companies already in the table — inserting ${toInsert.length} new ones.`);

  const BATCH = 100;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const { error } = await supabase.from('companies').insert(batch);
    if (error) throw error;
    console.log(`Inserted ${Math.min(i + BATCH, toInsert.length)} / ${toInsert.length}`);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
