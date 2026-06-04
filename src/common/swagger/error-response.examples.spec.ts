import {
  buildResourceErrorExamples,
  ERROR_RESPONSE_EXAMPLES,
  errorResponseSchema,
} from './error-response.examples';

describe('errorResponseSchema', () => {
  it('builds resource-specific not found messages', () => {
    expect(buildResourceErrorExamples('brands').notFound.message).toContain(
      'Brand with id',
    );
    expect(buildResourceErrorExamples('vehicles').notFound.message).toContain(
      'Vehicle with id',
    );
  });

  it('maps login unauthorized example', () => {
    expect(ERROR_RESPONSE_EXAMPLES.loginUnauthorized.message).toBe(
      'Invalid credentials',
    );
  });

  it('wraps example for Swagger schema', () => {
    expect(
      errorResponseSchema(buildResourceErrorExamples('users').forbidden),
    ).toEqual({
      example: buildResourceErrorExamples('users').forbidden,
    });
  });

  it('does not expose stack trace in documented examples', () => {
    for (const example of Object.values(buildResourceErrorExamples('brands'))) {
      expect(example).not.toHaveProperty('stack');
    }
  });
});
