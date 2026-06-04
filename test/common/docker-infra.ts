import { createConnection } from 'node:net';
import { env } from '../../src/config/env.config';
import { loadTestEnv } from './load-test-env';

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

export async function isDockerInfraAvailable(): Promise<boolean> {
  loadTestEnv();

  const [sqlReady, redisReady] = await Promise.all([
    probeTcp(env.DB_HOST, env.DB_PORT),
    probeTcp(env.REDIS_HOST, env.REDIS_PORT),
  ]);

  return sqlReady && redisReady;
}
