import { describe, expect, it } from 'vitest';
describe('web test setup', () => { it('uses the SolarQuote workspace', () => { expect('SolarQuote').toContain('Quote'); }); });