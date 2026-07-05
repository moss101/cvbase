import { assert, assertEquals } from 'jsr:@std/assert';
import { alignDraftToContext, draftToResumeData } from './mapping.ts';
import { CONTEXT, DRAFT1 } from './fixtures_test.ts';

Deno.test('alignDraftToContext: a model-normalized title/dates are overwritten from CONTEXT', () => {
  const drifted = {
    ...DRAFT1,
    experience: [{
      ...DRAFT1.experience[0],
      jobTitle: 'Platform Eng.', // model abbreviated; context says Data Platform Engineer
      startDate: '2022',         // model normalized; context says Mar 2022
    }],
  };
  const aligned = alignDraftToContext(drifted, CONTEXT);
  assertEquals(aligned.experience[0].jobTitle, 'Data Platform Engineer');
  assertEquals(aligned.experience[0].startDate, 'Mar 2022');
  // Bullets (the model's actual work product) are untouched.
  assertEquals(aligned.experience[0].bullets, drifted.experience[0].bullets);
});

Deno.test('alignDraftToContext: an invented employer is left as-is so grounding still flags it', () => {
  const invented = {
    ...DRAFT1,
    experience: [{ ...DRAFT1.experience[0], company: 'Google', jobTitle: 'Staff Engineer' }],
  };
  const aligned = alignDraftToContext(invented, CONTEXT);
  assertEquals(aligned.experience[0].company, 'Google');
  assertEquals(aligned.experience[0].jobTitle, 'Staff Engineer');
});

Deno.test('draftToResumeData: bullets become the template engine\'s <p>• …</p> HTML', () => {
  const out = draftToResumeData(DRAFT1, CONTEXT);
  const desc = out.experience[0].description;
  for (const bullet of DRAFT1.experience[0].bullets) {
    assert(desc.includes(`<p>• ${bullet}</p>`));
  }
});

Deno.test('draftToResumeData: HTML in model text is escaped, not rendered', () => {
  const hostile = {
    ...DRAFT1,
    experience: [{
      ...DRAFT1.experience[0],
      bullets: ['Improved <script>alert(1)</script> & "throughput"'],
    }],
  };
  const desc = draftToResumeData(hostile, CONTEXT).experience[0].description;
  assert(!desc.includes('<script>'));
  assert(desc.includes('&lt;script&gt;'));
  assert(desc.includes('&amp;'));
  assert(desc.includes('&quot;throughput&quot;'));
});

Deno.test('draftToResumeData: contact comes from the aggregated context, languages split into proficiency', () => {
  const out = draftToResumeData(DRAFT1, CONTEXT);
  assertEquals(out.contact.firstName, 'Avery');
  assertEquals(out.contact.email, 'avery@example.com');
  assertEquals(out.languages, [
    { id: out.languages[0].id, language: 'German', proficiency: 'Native' },
    { id: out.languages[1].id, language: 'English', proficiency: 'C1' },
  ]);
  assertEquals(out.certifications[0].name, 'CKA');
  // Sections PRISM does not write stay present-but-empty so the builder renders cleanly.
  assertEquals(out.awards, []);
  assertEquals(out.custom, []);
});

Deno.test('draftToResumeData: falls back to the target role title when the CV had none', () => {
  const noTitle = {
    ...CONTEXT,
    candidate: { ...CONTEXT.candidate, jobTitle: '' },
  };
  const out = draftToResumeData(DRAFT1, noTitle);
  assertEquals(out.contact.jobTitle, 'Senior Data Platform Engineer');
});
