import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';

/** Schema de validação das variáveis de ambiente (class-validator). */
export class EnvironmentVariables {
  @IsEnum(['development', 'test', 'production'])
  @IsOptional()
  NODE_ENV: string = 'development';

  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 4000;

  @IsString()
  API_PREFIX: string = 'api/v1';

  @IsString()
  @MinLength(32)
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '1h';

  @IsString()
  DB_HOST!: string;

  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  DB_PORT: number = 1433;

  @IsString()
  DB_USERNAME!: string;

  @ValidateIf((o: EnvironmentVariables) => o.NODE_ENV !== 'test')
  @IsString()
  @MinLength(8)
  DB_PASSWORD!: string;

  @IsString()
  DB_DATABASE!: string;

  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  @IsOptional()
  DB_ENCRYPT: boolean = false;

  @Transform(({ value }) => value !== 'false')
  @IsBoolean()
  @IsOptional()
  DB_TRUST_SERVER_CERTIFICATE: boolean = true;

  @IsString()
  REDIS_HOST!: string;

  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  REDIS_PORT: number = 6379;

  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @IsOptional()
  REDIS_CACHE_TTL: number = 300;

  @IsString()
  @IsOptional()
  SWAGGER_PATH: string = 'api/docs';

  @IsString()
  @IsOptional()
  CORS_ORIGINS: string = '';

  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @IsOptional()
  THROTTLE_TTL: number = 60000;

  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @IsOptional()
  THROTTLE_LIMIT: number = 100;

  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @IsOptional()
  THROTTLE_LOGIN_TTL: number = 60000;

  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @IsOptional()
  THROTTLE_LOGIN_LIMIT: number = 5;

  @ValidateIf((o: EnvironmentVariables) => o.NODE_ENV !== 'test')
  @IsString()
  @Matches(/^amqps?:\/\/.+/, {
    message: 'RABBITMQ_URL must start with amqp:// or amqps://',
  })
  RABBITMQ_URL?: string;

  @ValidateIf((o: EnvironmentVariables) => o.NODE_ENV !== 'test')
  @IsString()
  RABBITMQ_EXCHANGE?: string;

  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  RABBITMQ_PORT: number = 5672;

  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  RABBITMQ_MANAGEMENT_PORT: number = 15672;

  @ValidateIf((o: EnvironmentVariables) => o.NODE_ENV !== 'test')
  @IsString()
  @Matches(/^mongodb(\+srv)?:\/\/.+/, {
    message: 'MONGODB_URI must start with mongodb:// or mongodb+srv://',
  })
  MONGODB_URI?: string;

  @ValidateIf((o: EnvironmentVariables) => o.NODE_ENV !== 'test')
  @IsString()
  MONGODB_DATABASE?: string;

  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  MONGODB_PORT: number = 27017;
}

/**
 * Valida variáveis de ambiente e retorna configuração tipada.
 * Usada pelo ConfigModule e pelo script `yarn validate:env`.
 */
export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map((error) => {
      const constraints = Object.values(error.constraints ?? {});
      return `${error.property}: ${constraints.join(', ')}`;
    });

    throw new Error(
      `Environment validation failed:\n${errorMessages.join('\n')}`,
    );
  }

  return validatedConfig;
}
