import { needsVerification } from './gating';

test('an unverified profile needs verification', () => {
  expect(needsVerification({ verified: false })).toBe(true);
});

test('a null profile needs verification', () => {
  expect(needsVerification(null)).toBe(true);
});

test('a verified profile does not need verification', () => {
  expect(needsVerification({ verified: true })).toBe(false);
});
