// Flags a company's contact info as worth a second look: a role-based/generic email address
// (info@, sales@, ...) is often a dead end for procurement outreach, and a company with no
// email plus no other contact channel is effectively unreachable.
const GENERIC_LOCAL_PARTS = [
  'info',
  'contact',
  'sales',
  'office',
  'admin',
  'hello',
  'support',
  'general',
  'enquiries',
  'inquiries',
  'mail',
  'hr',
  'marketing',
  'sale',
  'service',
  'services',
  'team',
  'help',
  'company',
];

export type EmailQuality = 'ok' | 'generic' | 'missing' | 'incomplete';

export function getEmailQuality(c: { email: string; phone: string; website: string }): EmailQuality {
  const email = c.email.trim();
  if (!email) {
    return !c.phone.trim() && !c.website.trim() ? 'incomplete' : 'missing';
  }
  const localPart = (email.split('@')[0] ?? '').toLowerCase().replace(/[^a-z]/g, '');
  if (GENERIC_LOCAL_PARTS.some((g) => localPart === g || localPart.startsWith(g))) return 'generic';
  return 'ok';
}
