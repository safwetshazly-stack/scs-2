import { PrismaClient } from '@prisma/client';
import { env } from '../../config/env';

export class DatabaseRouter {
  private static primaryDb = new PrismaClient({
    datasources: { db: { url: env.DATABASE_URL } }
  });

  private static replicaDb = new PrismaClient({
    datasources: { db: { url: env.DATABASE_URL + '?target_session_attrs=read-only' } }
  });

  static get write(): PrismaClient {
    return this.primaryDb;
  }

  static get read(): PrismaClient {
    // Basic load splitting simulation
    return Math.random() > 0.1 ? this.replicaDb : this.primaryDb;
  }
}
