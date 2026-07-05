import { assertEquals } from 'jsr:@std/assert';
import { computeTotalYearsExperience } from './experience.ts';

const thisYear = new Date().getFullYear();

Deno.test('computeTotalYearsExperience: single role, explicit end year', () => {
  const years = computeTotalYearsExperience([{ startDate: '2019', endDate: '2021' }]);
  assertEquals(years, 2);
});

Deno.test('computeTotalYearsExperience: "Present"/"Current" resolves to this year', () => {
  const years = computeTotalYearsExperience([{ startDate: '2020', endDate: 'Present' }]);
  assertEquals(years, thisYear - 2020);
});

Deno.test('computeTotalYearsExperience: multiple non-overlapping roles sum', () => {
  const years = computeTotalYearsExperience([
    { startDate: '2019', endDate: '2021' },
    { startDate: '2021', endDate: 'Present' },
  ]);
  assertEquals(years, (thisYear - 2021) + 2);
});

Deno.test('computeTotalYearsExperience: overlapping/concurrent roles are merged, not summed', () => {
  const years = computeTotalYearsExperience([
    { startDate: '2019', endDate: '2023' },
    { startDate: '2020', endDate: '2021' }, // fully inside the first — must not add extra years
  ]);
  assertEquals(years, 4);
});

Deno.test('computeTotalYearsExperience: dates embedded in prose ("Mar 2022") still parse', () => {
  const years = computeTotalYearsExperience([{ startDate: 'Mar 2022', endDate: 'Present' }]);
  assertEquals(years, thisYear - 2022);
});

Deno.test('computeTotalYearsExperience: unparseable dates are skipped, not thrown', () => {
  const years = computeTotalYearsExperience([{ startDate: 'unknown', endDate: 'n/a' }]);
  assertEquals(years, 0);
});

Deno.test('computeTotalYearsExperience: empty work history returns 0', () => {
  assertEquals(computeTotalYearsExperience([]), 0);
});
