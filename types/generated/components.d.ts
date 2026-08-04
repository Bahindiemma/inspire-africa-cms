import type { Schema, Struct } from '@strapi/strapi';

export interface BlocksCallout extends Struct.ComponentSchema {
  collectionName: 'components_blocks_callouts';
  info: {
    displayName: 'Callout';
    icon: 'info-circle';
  };
  attributes: {
    text: Schema.Attribute.Text & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface BlocksHeading extends Struct.ComponentSchema {
  collectionName: 'components_blocks_headings';
  info: {
    displayName: 'Heading';
    icon: 'heading';
  };
  attributes: {
    anchorId: Schema.Attribute.String;
    level: Schema.Attribute.Enumeration<['h2', 'h3', 'h4']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'h2'>;
    text: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface BlocksImage extends Struct.ComponentSchema {
  collectionName: 'components_blocks_images';
  info: {
    displayName: 'Image';
    icon: 'image';
  };
  attributes: {
    alt: Schema.Attribute.String & Schema.Attribute.Required;
    caption: Schema.Attribute.String;
    fullBleed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
  };
}

export interface BlocksLede extends Struct.ComponentSchema {
  collectionName: 'components_blocks_ledes';
  info: {
    displayName: 'Lede';
    icon: 'align-left';
  };
  attributes: {
    text: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface BlocksList extends Struct.ComponentSchema {
  collectionName: 'components_blocks_lists';
  info: {
    displayName: 'List';
    icon: 'list-ul';
  };
  attributes: {
    items: Schema.Attribute.JSON & Schema.Attribute.Required;
    ordered: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
  };
}

export interface BlocksParagraph extends Struct.ComponentSchema {
  collectionName: 'components_blocks_paragraphs';
  info: {
    displayName: 'Paragraph';
    icon: 'paragraph';
  };
  attributes: {
    text: Schema.Attribute.Blocks & Schema.Attribute.Required;
  };
}

export interface BlocksQuote extends Struct.ComponentSchema {
  collectionName: 'components_blocks_quotes';
  info: {
    displayName: 'Pull quote';
    icon: 'quote-left';
  };
  attributes: {
    attribution: Schema.Attribute.String;
    text: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface BlocksTable extends Struct.ComponentSchema {
  collectionName: 'components_blocks_tables';
  info: {
    displayName: 'Table';
    icon: 'table';
  };
  attributes: {
    caption: Schema.Attribute.String;
    headers: Schema.Attribute.JSON & Schema.Attribute.Required;
    rows: Schema.Attribute.JSON & Schema.Attribute.Required;
  };
}

export interface BlocksTocAnchor extends Struct.ComponentSchema {
  collectionName: 'components_blocks_toc_anchors';
  info: {
    displayName: 'TOC anchor';
    icon: 'bookmark';
  };
  attributes: {
    anchorId: Schema.Attribute.String & Schema.Attribute.Required;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface BlocksVideo extends Struct.ComponentSchema {
  collectionName: 'components_blocks_videos';
  info: {
    displayName: 'Video';
    icon: 'video';
  };
  attributes: {
    autoplay: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    poster: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface CardsAudienceCard extends Struct.ComponentSchema {
  collectionName: 'components_cards_audience_cards';
  info: {
    displayName: 'Audience card';
    icon: 'users';
  };
  attributes: {
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    ctaHref: Schema.Attribute.String & Schema.Attribute.Required;
    ctaLabel: Schema.Attribute.String & Schema.Attribute.Required;
    isPrimary: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    number: Schema.Attribute.String & Schema.Attribute.DefaultTo<'01'>;
    photo: Schema.Attribute.Media<'images'>;
    photoAlt: Schema.Attribute.String;
    photoUrl: Schema.Attribute.String;
    tag: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface CardsFeatureItem extends Struct.ComponentSchema {
  collectionName: 'components_cards_feature_items';
  info: {
    displayName: 'Feature item';
    icon: 'check';
  };
  attributes: {
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    isBad: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    marker: Schema.Attribute.String & Schema.Attribute.DefaultTo<'01'>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface CardsProcessStep extends Struct.ComponentSchema {
  collectionName: 'components_cards_process_steps';
  info: {
    displayName: 'Process step';
    icon: 'list-ol';
  };
  attributes: {
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface CardsStat extends Struct.ComponentSchema {
  collectionName: 'components_cards_stats';
  info: {
    displayName: 'Stat';
    icon: 'chart-line';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface CardsStepCard extends Struct.ComponentSchema {
  collectionName: 'components_cards_step_cards';
  info: {
    displayName: 'Step card';
    icon: 'th-large';
  };
  attributes: {
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    marker: Schema.Attribute.String & Schema.Attribute.DefaultTo<'01'>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface CardsTestimonial extends Struct.ComponentSchema {
  collectionName: 'components_cards_testimonials';
  info: {
    displayName: 'Testimonial';
    icon: 'quote-right';
  };
  attributes: {
    flag: Schema.Attribute.Enumeration<
      ['Worker voice', 'Employer voice', 'Government voice', 'Partner voice']
    > &
      Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    photo: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    photoAlt: Schema.Attribute.String;
    quote: Schema.Attribute.Text & Schema.Attribute.Required;
    role: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ProfileCharacterReference extends Struct.ComponentSchema {
  collectionName: 'components_profile_character_references';
  info: {
    description: 'Andrew item 8. Referees are third parties who never consented themselves \u2014 contact details are private and require an Article 14 source-of-data notice.';
    displayName: 'Character reference';
    icon: 'user-friends';
  };
  attributes: {
    email: Schema.Attribute.Text & Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    noticeSentAt: Schema.Attribute.DateTime & Schema.Attribute.Private;
    organisation: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    phone: Schema.Attribute.Text & Schema.Attribute.Private;
    relationship: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    status: Schema.Attribute.Enumeration<
      ['not_contacted', 'requested', 'received', 'declined']
    > &
      Schema.Attribute.DefaultTo<'not_contacted'>;
  };
}

export interface ProfileContactPoint extends Struct.ComponentSchema {
  collectionName: 'components_profile_contact_points';
  info: {
    description: 'Andrew item 2 \u2014 typed channels rather than five columns, so each carries its own verification state.';
    displayName: 'Contact point';
    icon: 'phone';
  };
  attributes: {
    isPrimary: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    kind: Schema.Attribute.Enumeration<
      ['email', 'sms', 'messaging', 'landline', 'postal_address']
    > &
      Schema.Attribute.Required;
    label: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    value: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    verificationStatus: Schema.Attribute.Enumeration<
      ['self_declared', 'submitted', 'verified', 'rejected', 'expired']
    > &
      Schema.Attribute.DefaultTo<'self_declared'>;
  };
}

export interface ProfileDiseaseScreening extends Struct.ComponentSchema {
  collectionName: 'components_profile_disease_screenings';
  info: {
    description: 'Andrew item 9. SPECIAL CATEGORY DATA (GDPR Article 9). Gated behind explicit consent; results are private and encrypted-at-application where free text.';
    displayName: 'Disease screening';
    icon: 'syringe';
  };
  attributes: {
    certificateNumber: Schema.Attribute.String &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    disease: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    documentFile: Schema.Attribute.Media<'files' | 'images'> &
      Schema.Attribute.Private;
    expiresOn: Schema.Attribute.Date;
    issuingAuthority: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    result: Schema.Attribute.Enumeration<
      [
        'negative',
        'positive',
        'immune',
        'vaccinated',
        'inconclusive',
        'not_tested',
      ]
    > &
      Schema.Attribute.Private;
    testedOn: Schema.Attribute.Date;
    verificationStatus: Schema.Attribute.Enumeration<
      ['self_declared', 'submitted', 'verified', 'rejected', 'expired']
    > &
      Schema.Attribute.DefaultTo<'self_declared'>;
  };
}

export interface ProfileHealthClearance extends Struct.ComponentSchema {
  collectionName: 'components_profile_health_clearances';
  info: {
    description: 'Andrew item 7. SPECIAL CATEGORY DATA \u2014 health is GDPR Article 9, police clearance is Article 10. Only collected with separate explicit consent (community-signup.consentSpecialCategory) and only where a concrete purpose exists.';
    displayName: 'Health / police clearance';
    icon: 'shield-alt';
  };
  attributes: {
    documentFile: Schema.Attribute.Media<'files' | 'images'> &
      Schema.Attribute.Private;
    expiresOn: Schema.Attribute.Date;
    issuedOn: Schema.Attribute.Date;
    issuingAuthority: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    kind: Schema.Attribute.Enumeration<
      ['health_certificate', 'police_clearance']
    > &
      Schema.Attribute.Required;
    reference: Schema.Attribute.String &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    testsCovered: Schema.Attribute.Text & Schema.Attribute.Private;
    verificationStatus: Schema.Attribute.Enumeration<
      ['self_declared', 'submitted', 'verified', 'rejected', 'expired']
    > &
      Schema.Attribute.DefaultTo<'self_declared'>;
  };
}

export interface ProfileHiringNeed extends Struct.ComponentSchema {
  collectionName: 'components_profile_hiring_needs';
  info: {
    description: "What an employer registrant is actually looking for \u2014 the employer equivalent of a jobseeker's experience section.";
    displayName: 'Hiring need';
    icon: 'user-plus';
  };
  attributes: {
    destinationCountry: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    notes: Schema.Attribute.Text;
    occupationCode: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 16;
      }>;
    roleTitle: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    sector: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    startFrom: Schema.Attribute.Date;
    vacancies: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 100000;
          min: 0;
        },
        number
      >;
  };
}

export interface ProfileIdentityDocument extends Struct.ComponentSchema {
  collectionName: 'components_profile_identity_documents';
  info: {
    description: 'Andrew item 1. `number` is encrypted by the controller before storage \u2014 never write to it directly.';
    displayName: 'Identity document';
    icon: 'id-card';
  };
  attributes: {
    documentImage: Schema.Attribute.Media<'images' | 'files'> &
      Schema.Attribute.Private;
    expiresOn: Schema.Attribute.Date;
    issuedOn: Schema.Attribute.Date;
    issuingAuthority: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    issuingCountry: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    kind: Schema.Attribute.Enumeration<
      [
        'passport',
        'national_id',
        'birth_certificate',
        'drivers_licence',
        'residence_permit',
        'other',
      ]
    > &
      Schema.Attribute.Required;
    numberEncrypted: Schema.Attribute.Text & Schema.Attribute.Private;
    numberLast4: Schema.Attribute.String &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 4;
      }>;
    verificationStatus: Schema.Attribute.Enumeration<
      ['self_declared', 'submitted', 'verified', 'rejected', 'expired']
    > &
      Schema.Attribute.DefaultTo<'self_declared'>;
  };
}

export interface ProfileLanguageCompetency extends Struct.ComponentSchema {
  collectionName: 'components_profile_language_competencies';
  info: {
    description: 'Andrew item 6 \u2014 all seven attributes he listed.';
    displayName: 'Language competency';
    icon: 'language';
  };
  attributes: {
    expiresOn: Schema.Attribute.Date;
    framework: Schema.Attribute.Enumeration<
      ['CEFR', 'IELTS', 'TOEFL', 'other']
    > &
      Schema.Attribute.DefaultTo<'CEFR'>;
    grade: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    issuingBodyName: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    languageCode: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 8;
      }>;
    languageName: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    level: Schema.Attribute.Enumeration<
      ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native']
    >;
    qualificationTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    qualifiedOn: Schema.Attribute.Date;
    verificationStatus: Schema.Attribute.Enumeration<
      ['self_declared', 'submitted', 'verified', 'rejected', 'expired']
    > &
      Schema.Attribute.DefaultTo<'self_declared'>;
  };
}

export interface ProfileOrganisation extends Struct.ComponentSchema {
  collectionName: 'components_profile_organisations';
  info: {
    description: "Employer or government registrants. Andrew's 'regardless of their status' \u2014 an employer contact and a ministry official are people too, but the data we need from them is not a jobseeker profile.";
    displayName: 'Organisation';
    icon: 'building';
  };
  attributes: {
    contactJobTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    country: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    department: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    kind: Schema.Attribute.Enumeration<
      [
        'employer',
        'ministry',
        'agency',
        'public_employment_service',
        'recruiter',
        'training_provider',
        'other',
      ]
    >;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    registrationNumber: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    remit: Schema.Attribute.Text;
    sector: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    sizeBand: Schema.Attribute.Enumeration<
      ['1-9', '10-49', '50-249', '250-999', '1000+']
    >;
    verificationStatus: Schema.Attribute.Enumeration<
      ['self_declared', 'submitted', 'verified', 'rejected', 'expired']
    > &
      Schema.Attribute.DefaultTo<'self_declared'>;
    website: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
  };
}

export interface ProfileQualification extends Struct.ComponentSchema {
  collectionName: 'components_profile_qualifications';
  info: {
    description: 'Andrew items 3 AND 4 \u2014 same shape, discriminated by `kind`. kind=professional covers short courses and everything else.';
    displayName: 'Qualification';
    icon: 'graduation-cap';
  };
  attributes: {
    awardedOn: Schema.Attribute.Date;
    certificateFile: Schema.Attribute.Media<'files' | 'images'> &
      Schema.Attribute.Private;
    expiresOn: Schema.Attribute.Date;
    fieldOfStudy: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    grade: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    issuingBodyCountry: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    issuingBodyName: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    kind: Schema.Attribute.Enumeration<['academic', 'professional']> &
      Schema.Attribute.Required;
    level: Schema.Attribute.Enumeration<
      [
        'certificate',
        'diploma',
        'bachelor',
        'master',
        'doctorate',
        'short_course',
        'other',
      ]
    >;
    reference: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    verificationStatus: Schema.Attribute.Enumeration<
      ['self_declared', 'submitted', 'verified', 'rejected', 'expired']
    > &
      Schema.Attribute.DefaultTo<'self_declared'>;
  };
}

export interface ProfileWorkExperience extends Struct.ComponentSchema {
  collectionName: 'components_profile_work_experiences';
  info: {
    description: "Andrew item 5. `responsibilities` is the jobseeker's own words (evidence); `occupationCode` is our ISCO-08 match (interpretation). Both are kept.";
    displayName: 'Work experience';
    icon: 'briefcase';
  };
  attributes: {
    employerCountry: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    employerName: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    endedOn: Schema.Attribute.Date;
    isCurrent: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    jobTitle: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    matchSource: Schema.Attribute.Enumeration<
      ['self_selected', 'staff_matched', 'auto_suggested']
    >;
    occupationCode: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 16;
      }>;
    responsibilities: Schema.Attribute.Text;
    startedOn: Schema.Attribute.Date;
    verificationStatus: Schema.Attribute.Enumeration<
      ['self_declared', 'submitted', 'verified', 'rejected', 'expired']
    > &
      Schema.Attribute.DefaultTo<'self_declared'>;
  };
}

export interface SectionsAudiences extends Struct.ComponentSchema {
  collectionName: 'components_sections_audiences';
  info: {
    displayName: 'Audiences section';
    icon: 'users';
  };
  attributes: {
    cards: Schema.Attribute.Component<'cards.audience-card', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 6;
          min: 1;
        },
        number
      >;
    eyebrow: Schema.Attribute.String & Schema.Attribute.Required;
    headingHtml: Schema.Attribute.Text & Schema.Attribute.Required;
    lede: Schema.Attribute.Text;
  };
}

export interface SectionsCorridorsMarquee extends Struct.ComponentSchema {
  collectionName: 'components_sections_corridors_marquees';
  info: {
    displayName: 'Corridors marquee';
    icon: 'globe';
  };
  attributes: {
    corridors: Schema.Attribute.Relation<'oneToMany', 'api::corridor.corridor'>;
    label: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Operating across'>;
  };
}

export interface SectionsFeatureList extends Struct.ComponentSchema {
  collectionName: 'components_sections_feature_lists';
  info: {
    displayName: 'Feature list section';
    icon: 'list';
  };
  attributes: {
    eyebrow: Schema.Attribute.String & Schema.Attribute.Required;
    headingHtml: Schema.Attribute.Text & Schema.Attribute.Required;
    items: Schema.Attribute.Component<'cards.feature-item', true> &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    lede: Schema.Attribute.Text;
    tone: Schema.Attribute.Enumeration<['default', 'alt', 'yellow']> &
      Schema.Attribute.DefaultTo<'default'>;
  };
}

export interface SectionsFinalCta extends Struct.ComponentSchema {
  collectionName: 'components_sections_final_ctas';
  info: {
    displayName: 'Final CTA';
    icon: 'flag-checkered';
  };
  attributes: {
    eyebrow: Schema.Attribute.String & Schema.Attribute.Required;
    headingHtml: Schema.Attribute.Text & Schema.Attribute.Required;
    lede: Schema.Attribute.Text;
    primaryCta: Schema.Attribute.Component<'shared.cta', false> &
      Schema.Attribute.Required;
    secondaryLinks: Schema.Attribute.Component<'shared.nav-link', true>;
  };
}

export interface SectionsFormBlock extends Struct.ComponentSchema {
  collectionName: 'components_sections_form_blocks';
  info: {
    displayName: 'Form block';
    icon: 'envelope';
  };
  attributes: {
    anchorId: Schema.Attribute.String;
    eyebrow: Schema.Attribute.String;
    formKey: Schema.Attribute.Enumeration<
      ['contact', 'employers', 'governments']
    > &
      Schema.Attribute.Required;
    headingHtml: Schema.Attribute.Text & Schema.Attribute.Required;
    lede: Schema.Attribute.Text;
  };
}

export interface SectionsHero extends Struct.ComponentSchema {
  collectionName: 'components_sections_heroes';
  info: {
    displayName: 'Hero';
    icon: 'star';
  };
  attributes: {
    centered: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    ctas: Schema.Attribute.Component<'shared.cta', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 3;
        },
        number
      >;
    eyebrow: Schema.Attribute.String & Schema.Attribute.Required;
    headingHtml: Schema.Attribute.Text & Schema.Attribute.Required;
    lede: Schema.Attribute.Text & Schema.Attribute.Required;
    photo: Schema.Attribute.Media<'images'>;
    photoAlt: Schema.Attribute.String;
    photoCaptionSub: Schema.Attribute.String;
    photoCaptionTitle: Schema.Attribute.String;
    photoUrl: Schema.Attribute.String;
    priority: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    watermark: Schema.Attribute.String;
  };
}

export interface SectionsInsightsStrip extends Struct.ComponentSchema {
  collectionName: 'components_sections_insights_strips';
  info: {
    displayName: 'Insights strip';
    icon: 'newspaper';
  };
  attributes: {
    ctaHref: Schema.Attribute.String & Schema.Attribute.DefaultTo<'/blog'>;
    ctaLabel: Schema.Attribute.String & Schema.Attribute.DefaultTo<'Read more'>;
    eyebrow: Schema.Attribute.String & Schema.Attribute.Required;
    filterTag: Schema.Attribute.Relation<'oneToOne', 'api::tag.tag'>;
    headingHtml: Schema.Attribute.Text & Schema.Attribute.Required;
    lede: Schema.Attribute.Text;
    limit: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 6;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<3>;
  };
}

export interface SectionsNumbers extends Struct.ComponentSchema {
  collectionName: 'components_sections_numbers';
  info: {
    displayName: 'Numbers section';
    icon: 'chart-bar';
  };
  attributes: {
    eyebrow: Schema.Attribute.String;
    headingHtml: Schema.Attribute.Text;
    stats: Schema.Attribute.Component<'cards.stat', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 8;
          min: 1;
        },
        number
      >;
  };
}

export interface SectionsProcessList extends Struct.ComponentSchema {
  collectionName: 'components_sections_process_lists';
  info: {
    displayName: 'Process list section';
    icon: 'list-ol';
  };
  attributes: {
    eyebrow: Schema.Attribute.String & Schema.Attribute.Required;
    headingHtml: Schema.Attribute.Text & Schema.Attribute.Required;
    lede: Schema.Attribute.Text;
    steps: Schema.Attribute.Component<'cards.process-step', true> &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    tone: Schema.Attribute.Enumeration<['default', 'alt', 'yellow']> &
      Schema.Attribute.DefaultTo<'default'>;
  };
}

export interface SectionsStepCards extends Struct.ComponentSchema {
  collectionName: 'components_sections_step_cards';
  info: {
    displayName: 'Step cards section';
    icon: 'th';
  };
  attributes: {
    eyebrow: Schema.Attribute.String;
    headingHtml: Schema.Attribute.Text;
    items: Schema.Attribute.Component<'cards.step-card', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 6;
          min: 1;
        },
        number
      >;
  };
}

export interface SectionsTestimonials extends Struct.ComponentSchema {
  collectionName: 'components_sections_testimonials';
  info: {
    displayName: 'Testimonials section';
    icon: 'comment';
  };
  attributes: {
    eyebrow: Schema.Attribute.String;
    headingHtml: Schema.Attribute.Text;
    items: Schema.Attribute.Component<'cards.testimonial', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 6;
          min: 1;
        },
        number
      >;
  };
}

export interface SharedCta extends Struct.ComponentSchema {
  collectionName: 'components_shared_ctas';
  info: {
    displayName: 'CTA';
    icon: 'rocket';
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    isExternal: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    utmCampaign: Schema.Attribute.String;
    utmMedium: Schema.Attribute.String;
    utmSource: Schema.Attribute.String;
    variant: Schema.Attribute.Enumeration<['primary', 'ghost', 'dark']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'primary'>;
    withArrow: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
  };
}

export interface SharedFooterColumn extends Struct.ComponentSchema {
  collectionName: 'components_shared_footer_columns';
  info: {
    displayName: 'Footer column';
    icon: 'columns';
  };
  attributes: {
    heading: Schema.Attribute.String & Schema.Attribute.Required;
    links: Schema.Attribute.Component<'shared.nav-link', true>;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
  };
}

export interface SharedNavLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_nav_links';
  info: {
    displayName: 'Nav link';
    icon: 'link';
  };
  attributes: {
    ariaLabel: Schema.Attribute.String;
    href: Schema.Attribute.String & Schema.Attribute.Required;
    isCta: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isExternal: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
  };
}

export interface SharedPostalAddress extends Struct.ComponentSchema {
  collectionName: 'components_shared_postal_addresses';
  info: {
    displayName: 'Postal address';
    icon: 'map-marker';
  };
  attributes: {
    city: Schema.Attribute.String & Schema.Attribute.Required;
    country: Schema.Attribute.String & Schema.Attribute.Required;
    email: Schema.Attribute.Email;
    label: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Registered Office'>;
    phone: Schema.Attribute.String;
    postalCode: Schema.Attribute.String & Schema.Attribute.Required;
    region: Schema.Attribute.String;
    street: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: 'Per-page SEO metadata: canonical title, description, OG image.';
    displayName: 'SEO';
    icon: 'search';
  };
  attributes: {
    canonicalUrl: Schema.Attribute.String;
    metaDescription: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    metaKeywords: Schema.Attribute.String;
    metaRobots: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'index,follow'>;
    metaTitle: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 70;
      }>;
    ogImage: Schema.Attribute.Media<'images'>;
    ogType: Schema.Attribute.Enumeration<['website', 'article', 'profile']> &
      Schema.Attribute.DefaultTo<'website'>;
    structuredDataJson: Schema.Attribute.JSON;
  };
}

export interface SharedSocialLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_social_links';
  info: {
    displayName: 'Social link';
    icon: 'share-alt';
  };
  attributes: {
    handle: Schema.Attribute.String;
    iconKey: Schema.Attribute.String & Schema.Attribute.DefaultTo<'default'>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    platform: Schema.Attribute.Enumeration<
      [
        'linkedin',
        'facebook',
        'twitter',
        'instagram',
        'youtube',
        'tiktok',
        'threads',
        'whatsapp',
        'other',
      ]
    > &
      Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface TokensColorPair extends Struct.ComponentSchema {
  collectionName: 'components_tokens_color_pairs';
  info: {
    displayName: 'Color pair (light/dark)';
    icon: 'paint-brush';
  };
  attributes: {
    dark: Schema.Attribute.String & Schema.Attribute.Required;
    light: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'blocks.callout': BlocksCallout;
      'blocks.heading': BlocksHeading;
      'blocks.image': BlocksImage;
      'blocks.lede': BlocksLede;
      'blocks.list': BlocksList;
      'blocks.paragraph': BlocksParagraph;
      'blocks.quote': BlocksQuote;
      'blocks.table': BlocksTable;
      'blocks.toc-anchor': BlocksTocAnchor;
      'blocks.video': BlocksVideo;
      'cards.audience-card': CardsAudienceCard;
      'cards.feature-item': CardsFeatureItem;
      'cards.process-step': CardsProcessStep;
      'cards.stat': CardsStat;
      'cards.step-card': CardsStepCard;
      'cards.testimonial': CardsTestimonial;
      'profile.character-reference': ProfileCharacterReference;
      'profile.contact-point': ProfileContactPoint;
      'profile.disease-screening': ProfileDiseaseScreening;
      'profile.health-clearance': ProfileHealthClearance;
      'profile.hiring-need': ProfileHiringNeed;
      'profile.identity-document': ProfileIdentityDocument;
      'profile.language-competency': ProfileLanguageCompetency;
      'profile.organisation': ProfileOrganisation;
      'profile.qualification': ProfileQualification;
      'profile.work-experience': ProfileWorkExperience;
      'sections.audiences': SectionsAudiences;
      'sections.corridors-marquee': SectionsCorridorsMarquee;
      'sections.feature-list': SectionsFeatureList;
      'sections.final-cta': SectionsFinalCta;
      'sections.form-block': SectionsFormBlock;
      'sections.hero': SectionsHero;
      'sections.insights-strip': SectionsInsightsStrip;
      'sections.numbers': SectionsNumbers;
      'sections.process-list': SectionsProcessList;
      'sections.step-cards': SectionsStepCards;
      'sections.testimonials': SectionsTestimonials;
      'shared.cta': SharedCta;
      'shared.footer-column': SharedFooterColumn;
      'shared.nav-link': SharedNavLink;
      'shared.postal-address': SharedPostalAddress;
      'shared.seo': SharedSeo;
      'shared.social-link': SharedSocialLink;
      'tokens.color-pair': TokensColorPair;
    }
  }
}
