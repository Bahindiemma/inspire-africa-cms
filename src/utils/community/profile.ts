/**
 * Sanitisation + completeness scoring for the profile steps that follow
 * step 1 of signup (Andrew items 1-6 and 8).
 *
 * Same philosophy as utils/community/validate.ts: the caller is untrusted
 * even though it is our own Next.js server, and error messages never echo
 * submitted values because they can end up in a log aggregator.
 *
 * Items 7 (health certificate, police clearance) and 9 (infectious disease
 * screening) are DELIBERATELY ABSENT. They are GDPR Article 9 / Article 10
 * data, are not covered by the published lawful basis, and at signup there
 * is no purpose that would satisfy data minimisation. Adding them here
 * requires a completed DPIA first — see docs/19-community-signup.md.
 */
import { encryptPii, last4 } from './crypto';

export const LIMITS = {
  maxItemsPerList: 20,
  maxStr: 200,
  maxText: 2000,
  maxCode: 16,
};

const VERIFICATION = 'self_declared';

function str(v: unknown, max = LIMITS.maxStr): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

function bool(v: unknown): boolean {
  return v === true || v === 'true' || v === 'on' || v === '1';
}

/** ISO date (YYYY-MM-DD) or null. Rejects nonsense rather than storing it. */
function date(v: unknown): string | null {
  const s = str(v, 10);
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? s : null;
}

function oneOf(v: unknown, allowed: readonly string[]): string | null {
  const s = str(v, 64);
  return s && allowed.includes(s) ? s : null;
}

function list(v: unknown): any[] {
  return Array.isArray(v) ? v.slice(0, LIMITS.maxItemsPerList) : [];
}

/* ------------------------------------------------------------------ */

export const ID_KINDS = ['passport', 'national_id', 'birth_certificate', 'drivers_licence', 'residence_permit', 'other'] as const;
export const CONTACT_KINDS = ['email', 'sms', 'messaging', 'landline', 'postal_address'] as const;
export const QUAL_KINDS = ['academic', 'professional'] as const;
export const QUAL_LEVELS = ['certificate', 'diploma', 'bachelor', 'master', 'doctorate', 'short_course', 'other'] as const;
export const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native'] as const;
export const FRAMEWORKS = ['CEFR', 'IELTS', 'TOEFL', 'other'] as const;

export interface CleanProfile {
  otherNames: string | null;
  dateOfBirth: string | null;
  residentialAddress: string | null;
  identityDocuments: any[];
  contactPoints: any[];
  qualifications: any[];
  workExperiences: any[];
  languageCompetencies: any[];
  characterReferences: any[];
}

export function sanitizeProfile(body: any): CleanProfile {
  if (!body || typeof body !== 'object') throw new Error('payload must be an object');

  // Identity documents — the number is encrypted here, never stored in clear.
  const identityDocuments = list(body.identityDocuments)
    .map((d: any) => {
      const kind = oneOf(d?.kind, ID_KINDS);
      const number = str(d?.number, 64);
      if (!kind || !number) return null;
      return {
        kind,
        numberEncrypted: encryptPii(number),
        numberLast4: last4(number),
        issuingAuthority: str(d?.issuingAuthority, 160),
        issuingCountry: str(d?.issuingCountry, 80),
        issuedOn: date(d?.issuedOn),
        expiresOn: date(d?.expiresOn),
        verificationStatus: VERIFICATION,
      };
    })
    .filter(Boolean);

  const contactPoints = list(body.contactPoints)
    .map((c: any) => {
      const kind = oneOf(c?.kind, CONTACT_KINDS);
      const value = str(c?.value, LIMITS.maxText);
      if (!kind || !value) return null;
      return {
        kind,
        value,
        label: str(c?.label, 80),
        isPrimary: bool(c?.isPrimary),
        verificationStatus: VERIFICATION,
      };
    })
    .filter(Boolean);

  const qualifications = list(body.qualifications)
    .map((q: any) => {
      const kind = oneOf(q?.kind, QUAL_KINDS);
      const title = str(q?.title);
      if (!kind || !title) return null;
      return {
        kind,
        title,
        level: oneOf(q?.level, QUAL_LEVELS),
        fieldOfStudy: str(q?.fieldOfStudy, 160),
        issuingBodyName: str(q?.issuingBodyName),
        issuingBodyCountry: str(q?.issuingBodyCountry, 80),
        reference: str(q?.reference, 120),
        awardedOn: date(q?.awardedOn),
        expiresOn: date(q?.expiresOn),
        grade: str(q?.grade, 60),
        verificationStatus: VERIFICATION,
      };
    })
    .filter(Boolean);

  const workExperiences = list(body.workExperiences)
    .map((w: any) => {
      const employerName = str(w?.employerName);
      const jobTitle = str(w?.jobTitle, 160);
      if (!employerName || !jobTitle) return null;
      return {
        employerName,
        employerCountry: str(w?.employerCountry, 80),
        jobTitle,
        // Occupation matching is staff work, not a signup input — the visitor
        // gives us their words, we map them to ISCO-08 later.
        occupationCode: str(w?.occupationCode, LIMITS.maxCode),
        matchSource: w?.occupationCode ? 'self_selected' : null,
        startedOn: date(w?.startedOn),
        endedOn: date(w?.endedOn),
        isCurrent: bool(w?.isCurrent),
        responsibilities: str(w?.responsibilities, LIMITS.maxText),
        verificationStatus: VERIFICATION,
      };
    })
    .filter(Boolean);

  const languageCompetencies = list(body.languageCompetencies)
    .map((l: any) => {
      const languageCode = str(l?.languageCode, 8);
      if (!languageCode) return null;
      return {
        languageCode: languageCode.toLowerCase(),
        languageName: str(l?.languageName, 80),
        level: oneOf(l?.level, CEFR),
        framework: oneOf(l?.framework, FRAMEWORKS) ?? 'CEFR',
        qualificationTitle: str(l?.qualificationTitle, 160),
        issuingBodyName: str(l?.issuingBodyName),
        qualifiedOn: date(l?.qualifiedOn),
        expiresOn: date(l?.expiresOn),
        grade: str(l?.grade, 60),
        verificationStatus: VERIFICATION,
      };
    })
    .filter(Boolean);

  const characterReferences = list(body.characterReferences)
    .map((r: any) => {
      const name = str(r?.name, 160);
      if (!name) return null;
      return {
        name,
        relationship: str(r?.relationship, 120),
        email: str(r?.email, 254),
        phone: str(r?.phone, 32),
        organisation: str(r?.organisation),
        status: 'not_contacted',
      };
    })
    .filter(Boolean);

  return {
    otherNames: str(body.otherNames, 120),
    dateOfBirth: date(body.dateOfBirth),
    residentialAddress: str(body.residentialAddress, LIMITS.maxText),
    identityDocuments,
    contactPoints,
    qualifications,
    workExperiences,
    languageCompetencies,
    characterReferences,
  };
}

/**
 * 0-100 completeness, so partial profiles are visible and chaseable rather
 * than silently half-finished. Step 1 (the lead itself) is deliberately
 * worth 40 — a name, email and phone IS most of the commercial value, and a
 * score that read 8% for a perfectly good lead would be misleading.
 */
export function scoreCompleteness(row: any): number {
  let score = 0;
  if (row.firstName && row.lastName) score += 15;
  if (row.email) score += 15;
  if (row.phone) score += 10;
  if (row.dateOfBirth) score += 5;
  if (row.residentialAddress) score += 5;
  if (len(row.identityDocuments)) score += 15;
  if (len(row.qualifications)) score += 15;
  if (len(row.workExperiences)) score += 10;
  if (len(row.languageCompetencies)) score += 5;
  if (len(row.characterReferences)) score += 5;
  return Math.min(100, score);
}

function len(v: unknown): number {
  return Array.isArray(v) ? v.length : 0;
}
