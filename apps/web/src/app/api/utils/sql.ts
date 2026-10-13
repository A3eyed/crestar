import { neon, NeonQueryFunction } from '@neondatabase/serverless';

type SqlQueryFunction = NeonQueryFunction<false, false> & {
  query: NeonQueryFunction<false, false>;
};

function createClient(connectionString: string): SqlQueryFunction {
  const client = neon(connectionString) as SqlQueryFunction;
  client.query = client;
  return client;
}

let _sql: SqlQueryFunction | null = null;

function resolveConnectionString(): string | null {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || null;
}

/**
 * Lazy SQL client — reads DATABASE_URL on first use so Cloudflare Workers
 * env population is visible (module-top process.env can be empty at import).
 */
const sql = new Proxy(function sqlTag() {} as unknown as SqlQueryFunction, {
  apply(_target, _thisArg, argArray) {
    if (!_sql) {
      const url = resolveConnectionString();
      if (!url) {
        throw new Error(
          'No database connection string was provided to neon(). Set DATABASE_URL on the Worker.',
        );
      }
      _sql = createClient(url);
    }
    // @ts-expect-error tagged template
    return _sql(...argArray);
  },
  get(_target, prop) {
    if (!_sql) {
      const url = resolveConnectionString();
      if (!url) {
        throw new Error(
          'No database connection string was provided to neon(). Set DATABASE_URL on the Worker.',
        );
      }
      _sql = createClient(url);
    }
    if (prop === 'query') return _sql;
    const value = (_sql as any)[prop];
    return typeof value === 'function' ? value.bind(_sql) : value;
  },
}) as SqlQueryFunction;

export default sql;
