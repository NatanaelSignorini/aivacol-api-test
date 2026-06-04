import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  type ApiResource,
  buildResourceErrorExamples,
  errorResponseSchema,
} from './error-response.examples';

export type ApiErrorOptions = {
  resource: ApiResource;
  protected?: boolean;
};

function unauthorizedResponse(resource: ApiResource) {
  const examples = buildResourceErrorExamples(resource);

  return ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT',
    schema: errorResponseSchema(examples.unauthorized),
  });
}

function forbiddenResponse(resource: ApiResource) {
  const examples = buildResourceErrorExamples(resource);

  return ApiForbiddenResponse({
    description: 'Insufficient role',
    schema: errorResponseSchema(examples.forbidden),
  });
}

function withProtected(
  options: ApiErrorOptions,
  decorators: MethodDecorator[],
): MethodDecorator[] {
  return options.protected
    ? [...decorators, forbiddenResponse(options.resource)]
    : decorators;
}

/** GET collection — only auth errors apply. */
export function ApiListErrorResponses(options: ApiErrorOptions) {
  return applyDecorators(
    ...withProtected(options, [unauthorizedResponse(options.resource)]),
  );
}

/** GET by id — auth, invalid id, not found. */
export function ApiFindOneErrorResponses(options: ApiErrorOptions) {
  const examples = buildResourceErrorExamples(options.resource);

  return applyDecorators(
    ...withProtected(options, [
      unauthorizedResponse(options.resource),
      ApiBadRequestResponse({
        description: 'Invalid id format',
        schema: errorResponseSchema(examples.invalidUuid),
      }),
      ApiNotFoundResponse({
        description: 'Resource not found',
        schema: errorResponseSchema(examples.notFound),
      }),
    ]),
  );
}

/** POST — auth, validation, conflict; models may return 404 for invalid brandId. */
export function ApiCreateErrorResponses(options: ApiErrorOptions) {
  const examples = buildResourceErrorExamples(options.resource);
  const decorators: MethodDecorator[] = [
    unauthorizedResponse(options.resource),
    ApiBadRequestResponse({
      description: 'Validation error',
      schema: errorResponseSchema(examples.badRequest),
    }),
  ];

  if (options.resource === 'models') {
    decorators.push(
      ApiNotFoundResponse({
        description: 'Referenced brand not found',
        schema: errorResponseSchema(examples.brandNotFound),
      }),
    );
  } else {
    decorators.push(
      ApiConflictResponse({
        description: 'Unique constraint or business conflict',
        schema: errorResponseSchema(examples.conflict),
      }),
    );
  }

  return applyDecorators(...withProtected(options, decorators));
}

/** PATCH — auth, validation, not found, conflict (except models). */
export function ApiUpdateErrorResponses(options: ApiErrorOptions) {
  const examples = buildResourceErrorExamples(options.resource);
  const decorators: MethodDecorator[] = [
    unauthorizedResponse(options.resource),
    ApiBadRequestResponse({
      description: 'Validation error',
      schema: errorResponseSchema(examples.badRequestItem),
    }),
    ApiNotFoundResponse({
      description: 'Resource not found',
      schema: errorResponseSchema(examples.notFound),
    }),
  ];

  if (options.resource !== 'models') {
    decorators.push(
      ApiConflictResponse({
        description: 'Unique constraint or business conflict',
        schema: errorResponseSchema(examples.conflict),
      }),
    );
  }

  return applyDecorators(...withProtected(options, decorators));
}

/** DELETE — auth, not found; optional conflict or self-delete rules. */
export function ApiDeleteErrorResponses(options: ApiErrorOptions) {
  const examples = buildResourceErrorExamples(options.resource);
  const decorators: MethodDecorator[] = [
    unauthorizedResponse(options.resource),
    ApiNotFoundResponse({
      description: 'Resource not found',
      schema: errorResponseSchema(examples.notFound),
    }),
  ];

  if (options.resource === 'users') {
    decorators.push(
      ApiBadRequestResponse({
        description: 'Cannot delete own account',
        schema: errorResponseSchema(examples.selfDelete),
      }),
    );
  }

  if (options.resource === 'models') {
    decorators.push(
      ApiConflictResponse({
        description: 'Model referenced by vehicles',
        schema: errorResponseSchema(examples.deleteConflict),
      }),
    );
  }

  return applyDecorators(...withProtected(options, decorators));
}
