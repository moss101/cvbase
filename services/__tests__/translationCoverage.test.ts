import { describe, expect, it } from 'vitest';
import { translations, LANGUAGE_OPTIONS } from '../translationService';

// Every supported locale must carry every key the English catalogue has, so a
// new Career OS string can never ship untranslated in es/fr/de (REQ-30/COS-032).
describe('translation coverage', () => {
  const en = Object.keys(translations.en);

  it('has the four supported locales', () => {
    expect(LANGUAGE_OPTIONS.map((l) => l.code)).toEqual(['en', 'es', 'fr', 'de']);
  });

  for (const code of ['es', 'fr', 'de'] as const) {
    it(`${code} covers every English key`, () => {
      const missing = en.filter((k) => !(k in translations[code]));
      expect(missing, `missing in ${code}: ${missing.slice(0, 20).join(', ')}`).toEqual([]);
    });

    it(`${code} has no keys absent from English`, () => {
      const extra = Object.keys(translations[code]).filter((k) => !(k in translations.en));
      expect(extra).toEqual([]);
    });
  }

  it('has no empty English strings', () => {
    const empty = en.filter((k) => !String(translations.en[k]).trim());
    expect(empty).toEqual([]);
  });
});
