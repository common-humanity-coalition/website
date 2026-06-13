// Generates a REALISTIC FIXTURE snapshot.json (clearly fake content).
// The real exporter (sibling agent) produces a drop-in replacement at the same path.
// Run: node scripts/generate-fixture.mjs  (intended to run inside the node:22 container)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'data', 'snapshot.json');

// --- Deterministic PRNG (mulberry32) so the fixture is stable across runs ---
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260612);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pickN = (arr, n) => {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  }
  return out;
};
const chance = (p) => rand() < p;

// --- Vocabularies (friendly labels; values match the real DB) ---
const provinces = [
  { value: 'CA', label: 'Canada-wide' },
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' },
  { value: 'ON', label: 'Ontario' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'QC', label: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'YT', label: 'Yukon' },
];
const areas = [
  { value: 'k_12', label: 'K-12 Education' },
  { value: 'post_secondary', label: 'Post-secondary Education' },
  { value: 'courts', label: 'Courts' },
  { value: 'government', label: 'Government' },
  { value: 'health_care', label: 'Health Care' },
  { value: 'private_sector_employer', label: 'Private-sector Employer' },
  { value: 'professional_association', label: 'Professional Association' },
  { value: 'non_profit', label: 'Non-profit' },
  { value: 'hate_groups', label: 'Hate Groups' },
  { value: 'media', label: 'Media' },
  { value: 'individual', label: 'Individual' },
  { value: 'other', label: 'Other' },
];
const incidentTypes = [
  { value: 'hiring_restriction', label: 'Hiring restriction' },
  { value: 'hiring_preference', label: 'Hiring preference' },
  { value: 'program_eligibility_restriction', label: 'Program eligibility restriction' },
  { value: 'service_access_restriction', label: 'Service access restriction' },
  { value: 'training_requirement', label: 'Training requirement' },
  { value: 'policy_statement', label: 'Policy statement' },
  { value: 'institutional_communications', label: 'Institutional communications' },
  { value: 'education_practice', label: 'Education practice' },
  { value: 'disciplinary_action', label: 'Disciplinary action' },
  { value: 'procurement_or_grant_rule', label: 'Procurement or grant rule' },
  { value: 'individual_conduct', label: 'Individual conduct' },
  { value: 'public_figure_statement', label: 'Public-figure statement' },
  { value: 'other', label: 'Other' },
];
const targetingBases = [
  { value: 'race_or_ethnicity', label: 'Race or ethnicity' },
  { value: 'sex', label: 'Sex' },
  { value: 'sexual_orientation', label: 'Sexual orientation' },
  { value: 'religion', label: 'Religion' },
  { value: 'disability', label: 'Disability' },
  { value: 'age', label: 'Age' },
  { value: 'language', label: 'Language' },
  { value: 'other', label: 'Other' },
];

// --- Fake institution name parts (clearly fictional) ---
const orgPrefix = [
  'Maplewood', 'North Harbour', 'Cedar Valley', 'Riverbend', 'Lakeshore',
  'Fictional', 'Sample', 'Example', 'Placeholder', 'Birchwood', 'Westfield',
  'Grey Owl', 'Trillium', 'Aurora', 'Spruce Hollow', 'Kettle Lake',
];
const orgKind = {
  k_12: ['District School Board', 'Public School Authority', 'Secondary Academy'],
  post_secondary: ['University', 'College', 'Polytechnic Institute'],
  courts: ['Provincial Court Administration', 'Tribunal Services Office'],
  government: ['Ministry of Public Service', 'Regional Municipality', 'City Council'],
  health_care: ['Regional Health Authority', 'Community Hospital Network', 'Public Health Unit'],
  private_sector_employer: ['Logistics Corp.', 'Financial Group', 'Technology Partners Inc.'],
  professional_association: ['Association of Professionals', 'Regulatory College', 'Society of Practitioners'],
  non_profit: ['Community Foundation', 'Charitable Trust', 'Advocacy Network'],
  hate_groups: ['Fringe Coalition (fictional)', 'Extremist Collective (sample)'],
  media: ['Daily Dispatch (fictional)', 'Public Broadcaster (sample)', 'Regional Times'],
  individual: ['(named individual — fictional)', '(public commentator — sample)'],
  other: ['Civic Organization', 'Standards Body', 'Cooperative Association'],
};

const shortDescByType = {
  hiring_restriction: 'Job posting limited eligibility to applicants from specified demographic groups.',
  hiring_preference: 'Selection process gave formal preference based on a protected characteristic.',
  program_eligibility_restriction: 'Program access was restricted to members of a particular group.',
  service_access_restriction: 'A public service was offered only to certain demographic groups.',
  training_requirement: 'Mandatory training compelled affirmation of a contested ideological framework.',
  policy_statement: 'An official policy categorized people by group rather than individual circumstance.',
  institutional_communications: 'Official communications attributed collective guilt to a demographic group.',
  education_practice: 'Classroom practice segregated or evaluated students by group identity.',
  disciplinary_action: 'A person faced discipline for dissenting from a mandated viewpoint.',
  procurement_or_grant_rule: 'A grant rule conditioned funding on demographic quotas.',
  individual_conduct: 'An official acted to exclude a person on the basis of group identity.',
  public_figure_statement: 'A public figure endorsed treating people by category rather than as individuals.',
  other: 'A documented action inconsistent with the principle of singular worth.',
};

const longBody = (inst, type) =>
  `[FIXTURE — illustrative placeholder text, not a real event] ${inst} took an action recorded by reviewers as a "${type.replace(/_/g, ' ')}". ` +
  `According to the documented sources, the measure assigned outcomes to people on the basis of group membership rather than evaluating each person as an individual. ` +
  `Reviewers noted that the action was publicly described in institutional materials and was applied as a general rule rather than to a specific individual case. ` +
  `This entry exists to demonstrate the layout of the public database and contains no real names, dates, or claims. ` +
  `The full intake record preserves the original sources, captured at the time of submission, so that the documented facts can be independently verified.`;

const expectedHarmText = (basis) =>
  `[FIXTURE] By sorting people according to ${basis}, the measure risks treating individuals as representatives of a category, ` +
  `eroding the recognition of singular worth and undermining trust in the institution's fairness. ` +
  `Affected persons may be denied opportunities or services for reasons unrelated to their own conduct or needs.`;

const solutionText =
  `[FIXTURE] The institution could rescind the group-based rule and adopt criteria grounded in individual circumstance, ` +
  `merit, and demonstrated need, while publishing a transparent rationale and a route for affected persons to seek review.`;

const quoteTexts = [
  'Applicants who do not belong to the designated group need not apply for this stream.',
  'All staff are required to affirm the framework as a condition of continued employment.',
  'Eligibility for this benefit is reserved for members of the identified community.',
  'The committee will prioritize candidates on the basis of their demographic background.',
  'Participants must acknowledge collective responsibility before joining the program.',
  'Access to the service is limited to those who meet the identity criteria below.',
];
const quoteRationales = [
  'Conditions a benefit on group membership rather than individual circumstance.',
  'Compels affirmation of a contested viewpoint as a condition of participation.',
  'Treats people as representatives of a category rather than as individuals.',
  'Restricts a public service on the basis of a protected characteristic.',
];

const sourceHosts = [
  'example-news.test', 'sample-gazette.test', 'fictional-board.example',
  'placeholder-archive.test', 'demo-records.example', 'mock-tribune.test',
];

// --- Deterministic UUID-ish ids (clearly fixture, but valid uuid v4 shape) ---
function fakeUuid(i) {
  const hex = (n) => Math.floor(rand() * 16 ** n).toString(16).padStart(n, '0');
  const tag = i.toString(16).padStart(4, '0');
  return `f1c70000-${tag}-4${hex(3)}-8${hex(3)}-${hex(8)}${hex(4)}`;
}

function dateBetween(startYear, endYearInclusive) {
  const start = new Date(Date.UTC(startYear, 0, 1)).getTime();
  const end = new Date(Date.UTC(endYearInclusive, 11, 31)).getTime();
  const t = start + rand() * (end - start);
  return new Date(t).toISOString().slice(0, 10);
}

const N = 42; // ~40, covers all vocab
const incidents = [];

const usedAreas = new Set();
const usedTypes = new Set();
const usedBases = new Set();
const usedProv = new Set();

for (let i = 0; i < N; i++) {
  const area =
    i < areas.length ? areas[i].value : chance(0.92) ? pick(areas).value : null;
  const incidentType =
    i < incidentTypes.length
      ? incidentTypes[i].value
      : chance(0.92)
      ? pick(incidentTypes).value
      : null;
  const prov = i < provinces.length ? provinces[i].value : pick(provinces).value;

  if (area) usedAreas.add(area);
  if (incidentType) usedTypes.add(incidentType);
  usedProv.add(prov);

  let basis;
  if (i < targetingBases.length) {
    basis = [targetingBases[i].value];
    if (chance(0.4)) basis.push(pick(targetingBases).value);
  } else {
    basis = pickN(targetingBases, 1 + Math.floor(rand() * 3)).map((b) => b.value);
  }
  basis = [...new Set(basis)];
  basis.forEach((b) => usedBases.add(b));

  const areaKind = orgKind[area || 'other'] || orgKind.other;
  const institution = `${pick(orgPrefix)} ${pick(areaKind)}`;

  const incidentDate = chance(0.85) ? dateBetween(2021, 2026) : null;
  const pubYear = 2021 + Math.floor(rand() * 6);
  const pubMonth = Math.floor(rand() * 12);
  const pubDay = 1 + Math.floor(rand() * 27);
  const pubHour = Math.floor(rand() * 24);
  const published = new Date(
    Date.UTC(pubYear, pubMonth, pubDay, pubHour, Math.floor(rand() * 60), 0)
  ).toISOString();

  const typeForText = incidentType || 'other';
  const shortDescription = chance(0.9)
    ? shortDescByType[typeForText] || shortDescByType.other
    : null;

  const nQuotes = Math.floor(rand() * 5); // 0..4
  const quotes = Array.from({ length: nQuotes }).map(() => ({
    text: pick(quoteTexts),
    rationale: chance(0.8) ? pick(quoteRationales) : null,
  }));

  const nSources = Math.floor(rand() * 4); // 0..3
  const source_urls = Array.from({ length: nSources }).map((_, k) => {
    const host = pick(sourceHosts);
    return `https://${host}/records/fixture-${i}-${k}`;
  });

  incidents.push({
    id: fakeUuid(i),
    incident_date: incidentDate,
    published_at: published,
    jurisdiction: prov,
    institution_name: institution,
    area,
    incident_type: incidentType,
    targeting_basis: basis,
    short_description: shortDescription,
    description_of_event: chance(0.95) ? longBody(institution, typeForText) : null,
    expected_harm: chance(0.85) ? expectedHarmText(pick(basis.length ? basis : ['group identity'])) : null,
    solution: chance(0.7) ? solutionText : null,
    quotes,
    source_urls,
  });
}

incidents.sort((a, b) => (a.published_at < b.published_at ? 1 : -1));

const snapshot = {
  version: 1,
  generated_at: new Date(Date.UTC(2026, 5, 12, 9, 0, 0)).toISOString(),
  vocabularies: {
    provinces,
    areas,
    incident_types: incidentTypes,
    targeting_bases: targetingBases,
  },
  incidents,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(snapshot, null, 2));

console.log(`Wrote ${incidents.length} incidents to ${OUT}`);
console.log(`areas covered: ${usedAreas.size}/${areas.length}`);
console.log(`types covered: ${usedTypes.size}/${incidentTypes.length}`);
console.log(`bases covered: ${usedBases.size}/${targetingBases.length}`);
console.log(`provinces covered: ${usedProv.size}/${provinces.length}`);
