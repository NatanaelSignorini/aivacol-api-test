import { SWAGGER_DATE_EXAMPLE, UUID_V7_EXAMPLE } from './swagger.constants';

export type ErrorResponseExample = {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
};

export type ApiResource = 'brands' | 'models' | 'vehicles' | 'users';

export type ResourceErrorExamples = {
  unauthorized: ErrorResponseExample;
  forbidden: ErrorResponseExample;
  notFound: ErrorResponseExample;
  badRequest: ErrorResponseExample;
  badRequestItem: ErrorResponseExample;
  invalidUuid: ErrorResponseExample;
  conflict: ErrorResponseExample;
  deleteConflict: ErrorResponseExample;
  selfDelete: ErrorResponseExample;
  brandNotFound: ErrorResponseExample;
};

function errorExample(
  statusCode: number,
  message: string | string[],
  error: string,
  path: string,
): ErrorResponseExample {
  return {
    statusCode,
    message,
    error,
    timestamp: SWAGGER_DATE_EXAMPLE,
    path,
  };
}

/** Monta path de exemplo da API para documentação Swagger (`/api/v1/{resource}`). */
function apiPath(resource: ApiResource, id?: string): string {
  const base = `/api/v1/${resource}`;
  return id ? `${base}/${id}` : base;
}

const RESOURCE_LABEL: Record<ApiResource, string> = {
  brands: 'Brand',
  models: 'Model',
  vehicles: 'Vehicle',
  users: 'User',
};

const CONFLICT_MESSAGES: Record<ApiResource, string> = {
  brands: 'Brand with name "Toyota" already exists',
  models: `Model with id "${UUID_V7_EXAMPLE}" cannot be removed while vehicles reference it`,
  vehicles: 'Vehicle with license plate "ABC1D23" already exists',
  users: 'Email already registered',
};

const BAD_REQUEST_MESSAGES: Record<ApiResource, string[]> = {
  brands: ['name must be a string', 'name should not be empty'],
  models: ['name must be a string', 'brandId must be a UUID'],
  vehicles: ['licensePlate must be a string', 'year must be an integer number'],
  users: [
    'email must be an email',
    'password must be longer than 8 characters',
  ],
};

/** Gera exemplos de erro por recurso para decorators Swagger reutilizáveis. */
export function buildResourceErrorExamples(
  resource: ApiResource,
): ResourceErrorExamples {
  const label = RESOURCE_LABEL[resource];
  const collectionPath = apiPath(resource);
  const itemPath = apiPath(resource, UUID_V7_EXAMPLE);

  return {
    unauthorized: errorExample(
      401,
      'Unauthorized',
      'Unauthorized',
      collectionPath,
    ),
    forbidden: errorExample(
      403,
      'Insufficient permissions',
      'Forbidden',
      collectionPath,
    ),
    notFound: errorExample(
      404,
      `${label} with id "${UUID_V7_EXAMPLE}" not found`,
      'Not Found',
      itemPath,
    ),
    badRequest: errorExample(
      400,
      BAD_REQUEST_MESSAGES[resource],
      'Bad Request',
      collectionPath,
    ),
    badRequestItem: errorExample(
      400,
      BAD_REQUEST_MESSAGES[resource].slice(0, 1),
      'Bad Request',
      itemPath,
    ),
    invalidUuid: errorExample(
      400,
      'Validation failed (uuid is expected)',
      'Bad Request',
      `${collectionPath}/invalid-id`,
    ),
    conflict: errorExample(
      409,
      CONFLICT_MESSAGES[resource],
      'Conflict',
      collectionPath,
    ),
    deleteConflict: errorExample(
      409,
      CONFLICT_MESSAGES.models,
      'Conflict',
      itemPath,
    ),
    selfDelete: errorExample(
      400,
      'Cannot delete your own user account',
      'Bad Request',
      itemPath,
    ),
    brandNotFound: errorExample(
      404,
      `Brand with id "${UUID_V7_EXAMPLE}" not found`,
      'Not Found',
      collectionPath,
    ),
  };
}

export const ERROR_RESPONSE_EXAMPLES = {
  loginUnauthorized: errorExample(
    401,
    'Invalid credentials',
    'Unauthorized',
    '/api/v1/auth/login',
  ),
  logoutUnauthorized: errorExample(
    401,
    'Unauthorized',
    'Unauthorized',
    '/api/v1/auth/logout',
  ),
} as const satisfies Record<string, ErrorResponseExample>;

/** Envolve exemplo de erro no formato `{ example }` esperado pelo Swagger. */
export function errorResponseSchema(example: ErrorResponseExample) {
  return { example };
}
