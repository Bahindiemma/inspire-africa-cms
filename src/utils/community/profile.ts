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

export const ORG_KINDS = ['employer', 'ministry', 'agency', 'public_employment_service', 'recruiter', 'training_provider', 'other'] as const;
export const SIZE_BANDS = ['1-9', '10-49', '50-249', '250-999', '1000+'] as const;
export const CLEARANCE_KINDS = ['health_certificate', 'police_clearance'] as const;
export const SCREENING_RESULTS = ['negative', 'positive', 'immune', 'vaccinated', 'inconclusive', 'not_tested'] as const;

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
  organisation: any | null;
  hiringNeeds: any[];
  /** Article 9 / Article 10 — only populated when consent was given. */
  healthClearances: any[];
  diseaseScreenings: any[];
  consentSpecialCategory: boolean;
  profileImage: number | null;
  cvFile: number | null;
}

/** Media ids arrive as numbers from the upload endpoint. */
function mediaId(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
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
        documentImage: mediaId(d?.documentImage),
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
        certificateFile: mediaId(q?.certificateFile),
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

  // ---- Employer / government registrants -------------------------------
  const o = body.organisation;
  const organisation = o && str(o.name)
    ? {
        name: str(o.name)!,
        kind: oneOf(o.kind, ORG_KINDS),
        registrationNumber: str(o.registrationNumber, 120),
        country: str(o.country, 80),
        sector: str(o.sector, 120),
        sizeBand: oneOf(o.sizeBand, SIZE_BANDS),
        website: str(o.website, 255),
        contactJobTitle: str(o.contactJobTitle, 160),
        department: str(o.department),
        remit: str(o.remit, LIMITS.maxText),
        verificationStatus: VERIFICATION,
      }
    : null;

  const hiringNeeds = list(body.hiringNeeds)
    .map((h: any) => {
      const roleTitle = str(h?.roleTitle, 160);
      if (!roleTitle) return null;
      return {
        roleTitle,
        occupationCode: str(h?.occupationCode, LIMITS.maxCode),
        sector: str(h?.sector, 120),
        vacancies: Number.isFinite(Number(h?.vacancies))
          ? Math.max(0, Math.min(100000, Math.round(Number(h.vacancies))))
          : null,
        destinationCountry: str(h?.destinationCountry, 80),
        startFrom: date(h?.startFrom),
        notes: str(h?.notes, LIMITS.maxText),
      };
    })
    .filter(Boolean);

  // ---- Andrew items 7 and 9 — SPECIAL CATEGORY -------------------------
  // GDPR Article 9 (health) and Article 10 (criminal offences). These are
  // accepted ONLY when the registrant ticked the separate explicit-consent
  // box. Without it the arrays are dropped entirely rather than stored and
  // sorted out later — unlawfully-obtained special-category data is not
  // something you can fix retrospectively.
  const consentSpecialCategory = bool(body.consentSpecialCategory);

  const healthClearances = !consentSpecialCategory
    ? []
    : list(body.healthClearances)
        .map((h: any) => {
          const kind = oneOf(h?.kind, CLEARANCE_KINDS);
          if (!kind) return null;
          return {
            kind,
            reference: str(h?.reference, 120),
            issuingAuthority: str(h?.issuingAuthority),
            issuedOn: date(h?.issuedOn),
            expiresOn: date(h?.expiresOn),
            testsCovered: str(h?.testsCovered, LIMITS.maxText),
            documentFile: mediaId(h?.documentFile),
            verificationStatus: VERIFICATION,
          };
        })
        .filter(Boolean);

  const diseaseScreenings = !consentSpecialCategory
    ? []
    : list(body.diseaseScreenings)
        .map((d: any) => {
          const disease = str(d?.disease, 120);
          if (!disease) return null;
          return {
            disease,
            result: oneOf(d?.result, SCREENING_RESULTS),
            testedOn: date(d?.testedOn),
            expiresOn: date(d?.expiresOn),
            issuingAuthority: str(d?.issuingAuthority),
            certificateNumber: str(d?.certificateNumber, 120),
            documentFile: mediaId(d?.documentFile),
            verificationStatus: VERIFICATION,
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
    organisation,
    hiringNeeds,
    healthClearances,
    diseaseScreenings,
    consentSpecialCategory,
    profileImage: mediaId(body.profileImage),
    cvFile: mediaId(body.cvFile),
  };
}

/**
 * 0-100 completeness, so partial profiles are visible and chaseable rather
 * than silently half-finished.
 *
 * ROLE-AWARE. Scoring an employer against qualifications and passports would
 * permanently cap them at ~40% and make the number useless for the very
 * follow-up it exists to drive — an employer who has given us their company,
 * their role and what they are hiring for IS complete.
 *
 * Step 1 is deliberately worth 40 across every role: a name, email and phone
 * is most of the commercial value, and a score reading 8% for a perfectly
 * good lead would be actively misleading.
 *
 * Special-category items (health, police) are excluded from scoring on
 * purpose — nobody should be nudged toward supplying them to reach 100%.
 */
export function scoreCompleteness(row: any): number {
  const base =
    (row.firstName && row.lastName ? 15 : 0) +
    (row.email ? 15 : 0) +
    (row.phone ? 10 : 0);

  const type = row.registrantType || 'jobseeker';

  if (type === 'employer' || type === 'government') {
    const org = row.organisation;
    let s = base;
    if (org?.name) s += 20;
    if (org?.country) s += 5;
    if (org?.contactJobTitle) s += 10;
    if (type === 'employer') {
      if (org?.sector) s += 5;
      if (len(row.hiringNeeds)) s += 20;
    } else {
      if (org?.department) s += 10;
      if (org?.remit) s += 15;
    }
    if (len(row.contactPoints)) s += 5;
    return Math.min(100, s);
  }

  // jobseeker / other
  let s = base;
  if (row.dateOfBirth) s += 5;
  if (row.residentialAddress) s += 5;
  if (len(row.identityDocuments)) s += 15;
  if (len(row.qualifications)) s += 15;
  if (len(row.workExperiences)) s += 10;
  if (len(row.languageCompetencies)) s += 5;
  if (len(row.characterReferences)) s += 5;
  return Math.min(100, s);
}

function len(v: unknown): number {
  return Array.isArray(v) ? v.length : 0;
}
