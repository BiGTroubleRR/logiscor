// SERVER ONLY. Data access for the rate_quotes table, always via the service-role client —
// same model as companies.ts: the caller has already checked the Supabase session (see
// src/lib/role.ts and src/app/api/companies/rates/route.ts).
import { createAdminClient } from './admin-server';
import type { RateQuote } from '@/types/company';

export type NewRateQuoteInput = {
  origin: string;
  destination: string;
  transport_mode: string;
  load_type: string;
  container_type: string;
  vehicle_type: string;
  capacity: string;
  cargo_type: string;
  hazmat_class: string;
  service_type: string;
  delivery_scope: string;
  rate: number | null;
  dem_ft: string;
  notes: string;
};

export async function listRateQuotes(companyId: string): Promise<RateQuote[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('rate_quotes')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as RateQuote[];
}

export async function addRateQuote(companyId: string, input: NewRateQuoteInput): Promise<RateQuote> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('rate_quotes')
    .insert({ company_id: companyId, ...input })
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as RateQuote;
}

export async function deleteRateQuote(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('rate_quotes').delete().eq('id', id);
  if (error) throw error;
}
