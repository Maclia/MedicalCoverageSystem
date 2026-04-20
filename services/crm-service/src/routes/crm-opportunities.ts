/**
 * CRM Opportunities API Routes
 * Lightweight REST endpoints for opportunity pipeline management.
 */

import express, { Request, Response, Router } from 'express';
import { randomUUID } from 'crypto';

const router: Router = express.Router();

type OpportunityStage =
  | 'lead'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

type OpportunityPriority = 'low' | 'medium' | 'high' | 'critical';

interface Opportunity {
  id: string;
  title: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  estimatedValue: number;
  currency: string;
  stage: OpportunityStage;
  probability: number;
  expectedCloseDate?: string;
  owner: string;
  source?: string;
  priority: OpportunityPriority;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface OpportunityPayload {
  title?: unknown;
  customerName?: unknown;
  customerEmail?: unknown;
  customerPhone?: unknown;
  estimatedValue?: unknown;
  currency?: unknown;
  stage?: unknown;
  probability?: unknown;
  expectedCloseDate?: unknown;
  owner?: unknown;
  source?: unknown;
  priority?: unknown;
  notes?: unknown;
  tags?: unknown;
}

const allowedStages: OpportunityStage[] = [
  'lead',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
];

const allowedPriorities: OpportunityPriority[] = ['low', 'medium', 'high', 'critical'];

const opportunities = new Map<string, Opportunity>();

const seedData: Opportunity[] = [
  {
    id: randomUUID(),
    title: 'Corporate Health Plan Renewal',
    customerName: 'Acme Industries',
    customerEmail: 'benefits@acme.example',
    customerPhone: '+254700000001',
    estimatedValue: 250000,
    currency: 'KES',
    stage: 'proposal',
    probability: 70,
    expectedCloseDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21).toISOString(),
    owner: 'Jane Sales',
    source: 'Referral',
    priority: 'high',
    notes: 'Renewal discussion in progress with expanded outpatient cover.',
    tags: ['renewal', 'corporate'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    title: 'SME Inpatient Plan',
    customerName: 'BlueWave Logistics',
    customerEmail: 'hr@bluewave.example',
    customerPhone: '+254700000002',
    estimatedValue: 120000,
    currency: 'KES',
    stage: 'qualified',
    probability: 45,
    expectedCloseDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 35).toISOString(),
    owner: 'Mark Otieno',
    source: 'Website',
    priority: 'medium',
    notes: 'Needs pricing comparison against current provider.',
    tags: ['sme', 'new-business'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

for (const item of seedData) {
  opportunities.set(item.id, item);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isOptionalStringArray(value: unknown): value is string[] | undefined {
  return (
    value === undefined ||
    (Array.isArray(value) && value.every((item) => typeof item === 'string'))
  );
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function validateOpportunityPayload(
  payload: OpportunityPayload,
  partial: boolean = false
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!partial || payload.title !== undefined) {
    if (!isNonEmptyString(payload.title)) {
      errors.push('title is required and must be a non-empty string');
    }
  }

  if (!partial || payload.customerName !== undefined) {
    if (!isNonEmptyString(payload.customerName)) {
      errors.push('customerName is required and must be a non-empty string');
    }
  }

  if (!partial || payload.owner !== undefined) {
    if (!isNonEmptyString(payload.owner)) {
      errors.push('owner is required and must be a non-empty string');
    }
  }

  if (!partial || payload.estimatedValue !== undefined) {
    const estimatedValue = parseNumber(payload.estimatedValue);
    if (estimatedValue === null || estimatedValue < 0) {
      errors.push('estimatedValue is required and must be a positive number or 0');
    }
  }

  if (!partial || payload.probability !== undefined) {
    const probability = parseNumber(payload.probability);
    if (probability === null || probability < 0 || probability > 100) {
      errors.push('probability is required and must be a number between 0 and 100');
    }
  }

  if (!partial || payload.stage !== undefined) {
    if (typeof payload.stage !== 'string' || !allowedStages.includes(payload.stage as OpportunityStage)) {
      errors.push(`stage must be one of: ${allowedStages.join(', ')}`);
    }
  }

  if (!partial || payload.priority !== undefined) {
    if (
      typeof payload.priority !== 'string' ||
      !allowedPriorities.includes(payload.priority as OpportunityPriority)
    ) {
      errors.push(`priority must be one of: ${allowedPriorities.join(', ')}`);
    }
  }

  if (payload.currency !== undefined && !isNonEmptyString(payload.currency)) {
    errors.push('currency must be a non-empty string');
  }

  if (!isOptionalString(payload.customerEmail)) {
    errors.push('customerEmail must be a string');
  }

  if (!isOptionalString(payload.customerPhone)) {
    errors.push('customerPhone must be a string');
  }

  if (!isOptionalString(payload.expectedCloseDate)) {
    errors.push('expectedCloseDate must be a string');
  }

  if (!isOptionalString(payload.source)) {
    errors.push('source must be a string');
  }

  if (!isOptionalString(payload.notes)) {
    errors.push('notes must be a string');
  }

  if (!isOptionalStringArray(payload.tags)) {
    errors.push('tags must be an array of strings');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function toOpportunity(payload: OpportunityPayload): Opportunity {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    title: String(payload.title ?? '').trim(),
    customerName: String(payload.customerName ?? '').trim(),
    customerEmail: typeof payload.customerEmail === 'string' ? payload.customerEmail.trim() : undefined,
    customerPhone: typeof payload.customerPhone === 'string' ? payload.customerPhone.trim() : undefined,
    estimatedValue: Number(payload.estimatedValue),
    currency: typeof payload.currency === 'string' && payload.currency.trim() ? payload.currency.trim().toUpperCase() : 'KES',
    stage: payload.stage as OpportunityStage,
    probability: Number(payload.probability),
    expectedCloseDate:
      typeof payload.expectedCloseDate === 'string' && payload.expectedCloseDate.trim()
        ? payload.expectedCloseDate
        : undefined,
    owner: String(payload.owner ?? '').trim(),
    source: typeof payload.source === 'string' ? payload.source.trim() : undefined,
    priority: payload.priority as OpportunityPriority,
    notes: typeof payload.notes === 'string' ? payload.notes.trim() : undefined,
    tags: Array.isArray(payload.tags) ? payload.tags.map((tag) => tag.trim()).filter(Boolean) : [],
    createdAt: now,
    updatedAt: now,
  };
}

function applyOpportunityUpdates(opportunity: Opportunity, payload: OpportunityPayload): Opportunity {
  return {
    ...opportunity,
    title: payload.title !== undefined ? String(payload.title).trim() : opportunity.title,
    customerName:
      payload.customerName !== undefined ? String(payload.customerName).trim() : opportunity.customerName,
    customerEmail:
      payload.customerEmail !== undefined
        ? String(payload.customerEmail).trim() || undefined
        : opportunity.customerEmail,
    customerPhone:
      payload.customerPhone !== undefined
        ? String(payload.customerPhone).trim() || undefined
        : opportunity.customerPhone,
    estimatedValue:
      payload.estimatedValue !== undefined ? Number(payload.estimatedValue) : opportunity.estimatedValue,
    currency:
      payload.currency !== undefined
        ? String(payload.currency).trim().toUpperCase() || 'KES'
        : opportunity.currency,
    stage: payload.stage !== undefined ? (payload.stage as OpportunityStage) : opportunity.stage,
    probability: payload.probability !== undefined ? Number(payload.probability) : opportunity.probability,
    expectedCloseDate:
      payload.expectedCloseDate !== undefined
        ? String(payload.expectedCloseDate).trim() || undefined
        : opportunity.expectedCloseDate,
    owner: payload.owner !== undefined ? String(payload.owner).trim() : opportunity.owner,
    source:
      payload.source !== undefined ? String(payload.source).trim() || undefined : opportunity.source,
    priority:
      payload.priority !== undefined ? (payload.priority as OpportunityPriority) : opportunity.priority,
    notes: payload.notes !== undefined ? String(payload.notes).trim() || undefined : opportunity.notes,
    tags:
      payload.tags !== undefined
        ? (payload.tags as string[]).map((tag) => tag.trim()).filter(Boolean)
        : opportunity.tags,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * GET /api/crm-opportunities
 * List opportunities with optional filters.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { stage, owner, priority, search } = req.query;

    let results = Array.from(opportunities.values());

    if (typeof stage === 'string' && stage) {
      results = results.filter((item) => item.stage === stage);
    }

    if (typeof owner === 'string' && owner) {
      results = results.filter((item) =>
        item.owner.toLowerCase().includes(owner.toLowerCase())
      );
    }

    if (typeof priority === 'string' && priority) {
      results = results.filter((item) => item.priority === priority);
    }

    if (typeof search === 'string' && search.trim()) {
      const term = search.trim().toLowerCase();
      results = results.filter((item) =>
        [item.title, item.customerName, item.customerEmail, item.notes, item.source]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      );
    }

    results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    res.json({
      success: true,
      count: results.length,
      opportunities: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve CRM opportunities',
    });
  }
});

/**
 * GET /api/crm-opportunities/pipeline
 * Summarize opportunity counts and value by stage.
 */
router.get('/pipeline', async (_req: Request, res: Response) => {
  try {
    const summary = allowedStages.map((stage) => {
      const items = Array.from(opportunities.values()).filter((opportunity) => opportunity.stage === stage);
      const totalValue = items.reduce((sum, item) => sum + item.estimatedValue, 0);

      return {
        stage,
        count: items.length,
        totalValue,
      };
    });

    res.json({
      success: true,
      pipeline: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to build pipeline summary',
    });
  }
});

/**
 * GET /api/crm-opportunities/:id
 * Get one opportunity by id.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const opportunity = opportunities.get(req.params.id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found',
      });
    }

    res.json({
      success: true,
      opportunity,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve opportunity',
    });
  }
});

/**
 * POST /api/crm-opportunities
 * Create a new opportunity.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const payload = req.body as OpportunityPayload;
    const validation = validateOpportunityPayload(payload);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid opportunity payload',
        details: validation.errors,
      });
    }

    const opportunity = toOpportunity(payload);
    opportunities.set(opportunity.id, opportunity);

    res.status(201).json({
      success: true,
      opportunity,
      message: 'Opportunity created successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create opportunity',
    });
  }
});

/**
 * PUT /api/crm-opportunities/:id
 * Replace/update an existing opportunity.
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const existing = opportunities.get(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found',
      });
    }

    const payload = req.body as OpportunityPayload;
    const validation = validateOpportunityPayload(payload);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid opportunity payload',
        details: validation.errors,
      });
    }

    const updated = applyOpportunityUpdates(existing, payload);
    opportunities.set(updated.id, updated);

    res.json({
      success: true,
      opportunity: updated,
      message: 'Opportunity updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update opportunity',
    });
  }
});

/**
 * PATCH /api/crm-opportunities/:id/stage
 * Update opportunity stage and optionally probability.
 */
router.patch('/:id/stage', async (req: Request, res: Response) => {
  try {
    const existing = opportunities.get(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found',
      });
    }

    const { stage, probability } = req.body as { stage?: unknown; probability?: unknown };

    if (typeof stage !== 'string' || !allowedStages.includes(stage as OpportunityStage)) {
      return res.status(400).json({
        success: false,
        error: `stage must be one of: ${allowedStages.join(', ')}`,
      });
    }

    const parsedProbability = probability === undefined ? existing.probability : parseNumber(probability);
    if (parsedProbability === null || parsedProbability < 0 || parsedProbability > 100) {
      return res.status(400).json({
        success: false,
        error: 'probability must be a number between 0 and 100',
      });
    }

    const updated: Opportunity = {
      ...existing,
      stage: stage as OpportunityStage,
      probability: parsedProbability,
      updatedAt: new Date().toISOString(),
    };

    opportunities.set(updated.id, updated);

    res.json({
      success: true,
      opportunity: updated,
      message: 'Opportunity stage updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update opportunity stage',
    });
  }
});

/**
 * DELETE /api/crm-opportunities/:id
 * Delete an opportunity.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!opportunities.has(req.params.id)) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found',
      });
    }

    opportunities.delete(req.params.id);

    res.json({
      success: true,
      message: 'Opportunity deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete opportunity',
    });
  }
});

export default router;
