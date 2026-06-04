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

/** Decorator Swagger para resposta 401 (JWT ausente ou inválido). */
function unauthorizedResponse(resource: ApiResource) {
  const examples = buildResourceErrorExamples(resource);

  return ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT',
    schema: errorResponseSchema(examples.unauthorized),
  });
}

/** Decorator Swagger para resposta 403 (papel insuficiente). */
function forbiddenResponse(resource: ApiResource) {
  const examples = buildResourceErrorExamples(resource);

  return ApiForbiddenResponse({
    description: 'Insufficient role',
    schema: errorResponseSchema(examples.forbidden),
  });
}

/** Adiciona resposta 403 quando a rota exige papel protegido (`protected: true`). */
function withProtected(
  options: ApiErrorOptions,
  decorators: MethodDecorator[],
): MethodDecorator[] {
  return options.protected
    ? [...decorators, forbiddenResponse(options.resource)]
    : decorators;
}

/** GET coleção — apenas erros de autenticação (e 403 se protegido). */
export function ApiListErrorResponses(options: ApiErrorOptions) {
  return applyDecorators(
    ...withProtected(options, [unauthorizedResponse(options.resource)]),
  );
}

/** GET por id — auth, id inválido e not found. */
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

/** POST — auth, validação, conflito; models pode retornar 404 para brandId inválido. */
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

/** PATCH — auth, validação, not found, conflito (exceto models). */
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

/** DELETE — auth, not found; conflito ou auto-exclusão conforme recurso. */
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
