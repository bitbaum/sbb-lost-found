/**
 * Validation is the service's boundary with the outside world: everything
 * downstream — the repositories, the SQL — trusts that whatever got past here
 * has the shape it claims. So these tests are about the CLOSED side of the
 * gate: what must be rejected, not what happens to pass today.
 *
 * Only the middleware's observable contract is exercised (status code, error
 * envelope, whether next() ran). The Joi schemas are deliberately not imported
 * directly — restating them in a test would create a second copy of the rules
 * that can agree with itself while disagreeing with the route.
 */
import type { Request, Response, NextFunction } from 'express';

import { validateCreateLostItem, validateSearch } from '../validation';

jest.mock('../../utils/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

type Captured = {
  status?: number;
  body?: unknown;
};

function invoke(
  middleware: (req: Request, res: Response, next: NextFunction) => void,
  payload: Record<string, unknown>,
  where: 'body' | 'query' = 'body'
): { captured: Captured; nextCalled: boolean } {
  const captured: Captured = {};
  let nextCalled = false;

  const res = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(body: unknown) {
      captured.body = body;
      return this;
    },
  } as unknown as Response;

  const req = { [where]: payload } as unknown as Request;
  middleware(req, res, () => {
    nextCalled = true;
  });

  return { captured, nextCalled };
}

/** A payload that satisfies every required field, for one-field mutation. */
const validItem = {
  category: 'electronics',
  title: 'Black laptop bag',
  description: 'Left on the seat, contains a charger and notebook.',
};

describe('validateCreateLostItem', () => {
  it('passes a valid payload through to the handler', () => {
    const { captured, nextCalled } = invoke(validateCreateLostItem, validItem);
    expect(nextCalled).toBe(true);
    expect(captured.status).toBeUndefined();
  });

  it.each([
    ['category missing', { ...validItem, category: undefined }],
    ['category not a known one', { ...validItem, category: 'spaceship' }],
    ['title missing', { ...validItem, title: undefined }],
    ['title shorter than 3', { ...validItem, title: 'ab' }],
    ['title longer than 255', { ...validItem, title: 'x'.repeat(256) }],
    ['description missing', { ...validItem, description: undefined }],
    ['description shorter than 10', { ...validItem, description: 'too short' }],
    ['description longer than 2000', { ...validItem, description: 'x'.repeat(2001) }],
    ['reward negative', { ...validItem, rewardOffered: -1 }],
    ['reward above the cap', { ...validItem, rewardOffered: 10001 }],
    ['more than 10 images', { ...validItem, images: Array(11).fill('https://e.dev/i.png') }],
    ['an image that is not a URL', { ...validItem, images: ['not-a-url'] }],
    ['tripId not a uuid', { ...validItem, tripId: 'abc' }],
    ['approximateLossTime not ISO', { ...validItem, approximateLossTime: 'yesterday' }],
  ])('rejects when %s', (_label, payload) => {
    const { captured, nextCalled } = invoke(
      validateCreateLostItem,
      payload as Record<string, unknown>
    );
    expect(nextCalled).toBe(false);
    expect(captured.status).toBe(400);
  });

  it('reports which field failed, not just that something did', () => {
    // A 400 with no field is a dead end for the client and for support.
    const { captured } = invoke(validateCreateLostItem, { ...validItem, title: 'ab' });
    const body = captured.body as {
      success: boolean;
      error: { code: string; details: { field: string; message: string }[] };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.map((d) => d.field)).toContain('title');
  });

  it('never echoes the rejected payload back to the caller', () => {
    // The submitted body can contain contact details; a validation error is not
    // a reason to reflect them.
    const { captured } = invoke(validateCreateLostItem, {
      ...validItem,
      title: 'ab',
      contactInfo: { email: 'someone@example.com' },
    });
    expect(JSON.stringify(captured.body)).not.toContain('someone@example.com');
  });
});

describe('validateSearch', () => {
  it('accepts an empty query', () => {
    const { nextCalled } = invoke(validateSearch, {}, 'query');
    expect(nextCalled).toBe(true);
  });

  it.each([
    ['limit above the cap', { limit: 101 }],
    ['limit below 1', { limit: 0 }],
    ['limit not an integer', { limit: 1.5 }],
    ['offset negative', { offset: -1 }],
    ['status not a known one', { status: 'invented' }],
    ['category not a known one', { category: 'spaceship' }],
    ['vehicleId not a uuid', { vehicleId: 'nope' }],
    ['dateFrom not ISO', { dateFrom: 'last tuesday' }],
  ])('rejects when %s', (_label, query) => {
    const { captured, nextCalled } = invoke(validateSearch, query, 'query');
    expect(nextCalled).toBe(false);
    expect(captured.status).toBe(400);
  });

  it('caps limit at 100 — the guard against an unbounded scan', () => {
    expect(invoke(validateSearch, { limit: 100 }, 'query').nextCalled).toBe(true);
    expect(invoke(validateSearch, { limit: 101 }, 'query').nextCalled).toBe(false);
  });
});
