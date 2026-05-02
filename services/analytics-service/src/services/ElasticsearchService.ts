import { Client } from '@elastic/elasticsearch';
import { config } from '../config.js';

export class ElasticsearchService {
  private client: Client;
  private indexPrefix: string;

  constructor() {
    this.client = new Client({
      node: config.elasticsearch.node,
      auth: config.elasticsearch.username && config.elasticsearch.password
        ? { username: config.elasticsearch.username, password: config.elasticsearch.password }
        : undefined,
      ssl: { rejectUnauthorized: config.nodeEnv === 'production' }
    });
    this.indexPrefix = config.elasticsearch.indexPrefix;
  }

  async initializeIndices(): Promise<void> {
    const auditLogIndex = this.getIndexName('audit_logs');

    // Check if index exists
    const exists = await this.client.indices.exists({ index: auditLogIndex });

    if (!exists) {
      await this.client.indices.create({
        index: auditLogIndex,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'keyword' },
            action: { type: 'keyword' },
            resource: { type: 'keyword' },
            method: { type: 'keyword' },
            path: { type: 'keyword' },
            statusCode: { type: 'integer' },
            ipAddress: { type: 'ip' },
            userAgent: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
            requestBody: { type: 'text' },
            responseBody: { type: 'text' },
            durationMs: { type: 'integer' },
            createdAt: { type: 'date' }
          }
        }
      });
    }
  }

  async indexAuditLog(auditLog: {
    id: string;
    userId?: string;
    action: string;
    resource: string;
    method: string;
    path: string;
    statusCode: number;
    ipAddress?: string;
    userAgent?: string;
    requestBody?: Record<string, any>;
    responseBody?: Record<string, any>;
    durationMs?: number;
    createdAt: Date;
  }): Promise<void> {
    await this.client.index({
      index: this.getIndexName('audit_logs'),
      id: auditLog.id,
      document: auditLog
    });
  }

  async searchAuditLogs(
    query: string,
    filters: { userId?: string; action?: string; fromDate?: Date; toDate?: Date } = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ total: number; results: any[] }> {
    const from = (page - 1) * pageSize;

    const boolQuery: any = {
      must: [],
      filter: []
    };

    if (query) {
      boolQuery.must.push({
        multi_match: {
          query,
          fields: ['action', 'resource', 'path', 'requestBody', 'responseBody', 'userAgent']
        }
      });
    }

    if (filters.userId) boolQuery.filter.push({ term: { userId: filters.userId } });
    if (filters.action) boolQuery.filter.push({ term: { action: filters.action } });
    if (filters.fromDate || filters.toDate) {
      boolQuery.filter.push({
        range: {
          createdAt: {
            ...(filters.fromDate ? { gte: filters.fromDate.toISOString() } : {}),
            ...(filters.toDate ? { lte: filters.toDate.toISOString() } : {})
          }
        }
      });
    }

    const result = await this.client.search({
      index: this.getIndexName('audit_logs'),
      query: boolQuery,
      from,
      size: pageSize,
      sort: [{ createdAt: { order: 'desc' } }]
    });

    return {
      total: result.hits.total.value,
      results: result.hits.hits.map(hit => hit._source)
    };
  }

  private getIndexName(indexName: string): string {
    return `${this.indexPrefix}_${indexName}`;
  }

  getClient(): Client {
    return this.client;
  }
}

export const elasticsearchService = new ElasticsearchService();