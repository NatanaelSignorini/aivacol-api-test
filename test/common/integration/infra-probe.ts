import { createConnection } from 'node:net';
import { loadIntegrationTestEnv } from '../test-env';

function probeTcp(
  host: string,
  port: number,
  timeoutMs = 3000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });

    const finish = (ok: boolean) => {
      socket.removeAllListeners();
      if (!socket.destroyed) {
        socket.destroy();
      }
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

export async function isIntegrationInfraReachable(): Promise<boolean> {
  loadIntegrationTestEnv();

  const dbHost = process.env.DB_HOST ?? 'localhost';
  const dbPort = Number.parseInt(process.env.DB_PORT ?? '1433', 10);
  const redisHost = process.env.REDIS_HOST ?? 'localhost';
  const redisPort = Number.parseInt(process.env.REDIS_PORT ?? '6379', 10);

  const [sqlReady, redisReady] = await Promise.all([
    probeTcp(dbHost, dbPort),
    probeTcp(redisHost, redisPort),
  ]);

  return sqlReady && redisReady;
}
