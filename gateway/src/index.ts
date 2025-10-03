import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import crypto from 'node:crypto';
import pkg from '../package.json' with { type: 'json' };

// ---------------------- Config -----------------------------------
function toNumber(val: string | undefined, fallback: number): number {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const PORT = toNumber(process.env.PORT, 8080);
const GRAPHQL_PATH = process.env.GRAPHQL_PATH || '/graphql';
const REST_PREFIX = process.env.REST_PREFIX || '/api';
const SERVICE_NAME = 'gateway';
const VERSION = (pkg as any).version || '0.0.0';
let isReady = false;

// ---------------------- App Init ---------------------------------
const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Request logging + request id
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as unknown as { reqId?: string }).reqId = crypto.randomUUID();
  const reqId = (req as unknown as { reqId?: string }).reqId;
  console.log(JSON.stringify({ level: 'info', msg: 'request', method: req.method, path: req.path, reqId }));
  next();
});

// Health & readiness
app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok', service: SERVICE_NAME, version: VERSION }));
app.get('/ready', (_req: Request, res: Response) => {
  if (!isReady) return res.status(503).json({ status: 'starting', service: SERVICE_NAME });
  return res.json({ status: 'ready', service: SERVICE_NAME });
});

// REST placeholder root under prefix
app.get(REST_PREFIX, (_req: Request, res: Response) => {
  res.json({ message: 'REST gateway placeholder', version: VERSION });
});

// GraphQL schema
const typeDefs = /* GraphQL */ `
  type HealthInfo {
    status: String!
    service: String!
    version: String!
    reqId: String!
  }
  type Query {
    health: HealthInfo!
    version: String!
  }
`;

const resolvers = {
  Query: {
    health: (_parent: unknown, _args: unknown, ctx: { reqId: string }) => ({
      status: 'ok',
      service: SERVICE_NAME,
      version: VERSION,
      reqId: ctx.reqId,
    }),
    version: () => VERSION,
  },
};


async function start() {
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  app.use(
    GRAPHQL_PATH,
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }: { req: Request }) => {
        const r = req as unknown as { reqId?: string };
        return { reqId: r.reqId || crypto.randomUUID() };
      },
    })
  );

  // 404 handler (must be AFTER GraphQL & other routes)
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next();
    res.status(404).json({ error: 'not_found', path: req.path });
  });

  // Error handler (last)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const reqId = (req as unknown as { reqId?: string }).reqId;
    console.error(JSON.stringify({ level: 'error', msg: 'request_error', err, path: req.path, reqId }));
    res.status(500).json({ error: 'internal_error', reqId });
  });

  const httpServer = app.listen(PORT, () => {
    isReady = true;
    console.log(JSON.stringify({ level: 'info', msg: 'listening', service: SERVICE_NAME, port: PORT, graphql: GRAPHQL_PATH, restPrefix: REST_PREFIX, version: VERSION }));
  });

  const shutdown = async (signal: string) => {
    console.log(JSON.stringify({ level: 'info', msg: 'shutdown_start', signal }));
    isReady = false;
    try {
      await server.stop();
    } catch (e) {
      console.error(JSON.stringify({ level: 'error', msg: 'apollo_stop_failed', err: e }));
    }
    httpServer.close(() => {
      console.log(JSON.stringify({ level: 'info', msg: 'shutdown_complete' }));
      process.exit(0);
    });
  const t = setTimeout(() => process.exit(1), 8000);
  if (typeof (t as any).unref === 'function') (t as any).unref();
  };
  ['SIGINT', 'SIGTERM'].forEach(sig => process.on(sig as any, () => shutdown(sig)));
}

start().catch((err) => {
  console.error(JSON.stringify({ level: 'fatal', msg: 'startup_failed', err }));
  process.exit(1);
});
