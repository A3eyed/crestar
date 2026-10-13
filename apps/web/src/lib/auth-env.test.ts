import { describe, expect, it } from 'vitest';
import { safeErrorInfo } from './auth-env';

describe('safeErrorInfo', () => {
  it('extracts name and message from Error', () => {
    const info = safeErrorInfo(new Error('NEON_AUTH_BASE_URL is not set'));
    expect(info.name).toBe('Error');
    expect(info.message).toContain('NEON_AUTH_BASE_URL');
  });

  it('handles non-Error values', () => {
    const info = safeErrorInfo('boom');
    expect(info.message).toBe('boom');
  });

  it('includes cause message when present', () => {
    const err = new Error('outer');
    (err as Error & { cause?: Error }).cause = new Error('inner');
    const info = safeErrorInfo(err);
    expect(info.causeMessage).toBe('inner');
  });
});
