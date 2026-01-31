import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db';
import {
  commissionTiers,
  agents,
  insertCommissionTierSchema
} from '../../../shared/schema.js';
import { eq, desc, asc, sql } from 'drizzle-orm';

const router = Router();

// GET /api/crm/commission-tiers - List all commission tiers
router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      isActive,
      sortBy = 'baseRate',
      sortOrder = 'desc'
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const limitNum = parseInt(limit as string);

    // Build query conditions
    let whereConditions = [];

    if (isActive !== undefined) {
      whereConditions.push(eq(commissionTiers.isActive, isActive === 'true'));
    }

    // Build order by
    let orderBy;
    const sortField = commissionTiers[sortBy as keyof typeof commissionTiers];
    if (sortField) {
      orderBy = sortOrder === 'desc' ? desc(sortField) : asc(sortField);
    } else {
      orderBy = desc(commissionTiers.baseRate);
    }

    // Get tiers with agent count
    const tiersQuery = db.select({
      id: commissionTiers.id,
      tierName: commissionTiers.tierName,
      description: commissionTiers.description,
      baseRate: commissionTiers.baseRate,
      bonusThreshold: commissionTiers.bonusThreshold,
      bonusRate: commissionTiers.bonusRate,
      individualRate: commissionTiers.individualRate,
      corporateRate: commissionTiers.corporateRate,
      familyRate: commissionTiers.familyRate,
      effectiveDate: commissionTiers.effectiveDate,
      expiryDate: commissionTiers.expiryDate,
      isActive: commissionTiers.isActive,
      createdAt: commissionTiers.createdAt
    })
    .from(commissionTiers)
    .where(and(...whereConditions));

    const allTiers = await tiersQuery.orderBy(orderBy);

    // Get agent count for each tier
    const tiersWithAgentCount = await Promise.all(
      allTiers.map(async (tier) => {
        const agentCount = await db.select()
          .from(agents)
          .where(and(
            eq(agents.commissionTierId, tier.id),
            eq(agents.isActive, true)
          ))
          .then(result => result.length);

        return {
          ...tier,
          agentCount
        };
      })
    );

    // Get total count for pagination
    const totalCount = allTiers.length;
    const paginatedTiers = tiersWithAgentCount.slice(offset, offset + limitNum);

    res.json({
      success: true,
      data: paginatedTiers,
      pagination: {
        page: parseInt(page as string),
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching commission tiers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch commission tiers'
    });
  }
});

// POST /api/crm/commission-tiers - Create new commission tier
router.post('/', async (req, res) => {
  try {
    const validatedData = insertCommissionTierSchema.parse(req.body);

    // Validate date ranges
    if (validatedData.effectiveDate && validatedData.expiryDate) {
      if (new Date(validatedData.effectiveDate) >= new Date(validatedData.expiryDate)) {
        return res.status(400).json({
          success: false,
          error: 'Effective date must be before expiry date'
        });
      }
    }

    // Check for overlapping tiers with same name
    const existingTier = await db.select()
      .from(commissionTiers)
      .where(eq(commissionTiers.tierName, validatedData.tierName))
      .limit(1);

    if (existingTier.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Tier with this name already exists'
      });
    }

    const [newTier] = await db.insert(commissionTiers)
      .values({
        ...validatedData,
        isActive: true,
        createdAt: new Date()
      })
      .returning();

    res.status(201).json({ success: true, data: newTier });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error creating commission tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create commission tier'
    });
  }
});

// GET /api/crm/commission-tiers/:id - Get specific commission tier details
router.get('/:id', async (req, res) => {
  try {
    const tierId = req.params.id;

    const [tier] = await db.select({
      id: commissionTiers.id,
      tierName: commissionTiers.tierName,
      description: commissionTiers.description,
      baseRate: commissionTiers.baseRate,
      bonusThreshold: commissionTiers.bonusThreshold,
      bonusRate: commissionTiers.bonusRate,
      individualRate: commissionTiers.individualRate,
      corporateRate: commissionTiers.corporateRate,
      familyRate: commissionTiers.familyRate,
      effectiveDate: commissionTiers.effectiveDate,
      expiryDate: commissionTiers.expiryDate,
      isActive: commissionTiers.isActive,
      createdAt: commissionTiers.createdAt
    })
    .from(commissionTiers)
    .where(eq(commissionTiers.id, tierId));

    if (!tier) {
      return res.status(404).json({
        success: false,
        error: 'Commission tier not found'
      });
    }

    // Get agents assigned to this tier
    const tierAgents = await db.select({
      id: agents.id,
      agentCode: agents.agentCode,
      agentType: agents.agentType,
      targetAnnualPremium: agents.targetAnnualPremium,
      ytdPremium: agents.ytdPremium,
      ytdCommission: agents.ytdCommission,
      joinDate: agents.joinDate,
      isActive: agents.isActive
    })
    .from(agents)
    .where(eq(agents.commissionTierId, tierId))
    .orderBy(desc(agents.ytdPremium));

    // Calculate tier statistics
    const tierStats = await db.select({
      totalAgents: sql<number>`COUNT(*)`,
      activeAgents: sql<number>`SUM(CASE WHEN ${agents.isActive} = true THEN 1 ELSE 0 END)`,
      totalYtdPremium: sql<number>`SUM(${agents.ytdPremium})`,
      totalYtdCommission: sql<number>`SUM(${agents.ytdCommission})`,
      avgPerformance: sql<number>`AVG(
        CASE WHEN ${agents.targetAnnualPremium} > 0
        THEN (${agents.ytdPremium}::float / ${agents.targetAnnualPremium}::float) * 100
        ELSE 0 END
      )`
    })
    .from(agents)
    .where(eq(agents.commissionTierId, tierId));

    res.json({
      success: true,
      data: {
        ...tier,
        agents: tierAgents,
        statistics: tierStats[0] || {
          totalAgents: 0,
          activeAgents: 0,
          totalYtdPremium: 0,
          totalYtdCommission: 0,
          avgPerformance: 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching commission tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch commission tier'
    });
  }
});

// PUT /api/crm/commission-tiers/:id - Update commission tier
router.put('/:id', async (req, res) => {
  try {
    const tierId = req.params.id;

    const validatedData = insertCommissionTierSchema.partial().parse(req.body);

    // Validate date ranges
    if (validatedData.effectiveDate && validatedData.expiryDate) {
      if (new Date(validatedData.effectiveDate) >= new Date(validatedData.expiryDate)) {
        return res.status(400).json({
          success: false,
          error: 'Effective date must be before expiry date'
        });
      }
    }

    // Check for name conflicts
    if (validatedData.tierName) {
      const existingTier = await db.select()
        .from(commissionTiers)
        .where(and(
          eq(commissionTiers.tierName, validatedData.tierName),
          sql`${commissionTiers.id} != ${tierId}`
        ))
        .limit(1);

      if (existingTier.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Tier with this name already exists'
        });
      }
    }

    const [updatedTier] = await db.update(commissionTiers)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(commissionTiers.id, tierId))
      .returning();

    if (!updatedTier) {
      return res.status(404).json({
        success: false,
        error: 'Commission tier not found'
      });
    }

    res.json({ success: true, data: updatedTier });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error updating commission tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update commission tier'
    });
  }
});

// DELETE /api/crm/commission-tiers/:id - Deactivate commission tier
router.delete('/:id', async (req, res) => {
  try {
    const tierId = req.params.id;

    // Check if tier is assigned to any agents
    const assignedAgents = await db.select()
      .from(agents)
      .where(eq(agents.commissionTierId, tierId))
      .limit(1);

    if (assignedAgents.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot deactivate tier with assigned agents'
      });
    }

    const [deactivatedTier] = await db.update(commissionTiers)
      .set({
        isActive: false,
        expiryDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(commissionTiers.id, tierId))
      .returning();

    if (!deactivatedTier) {
      return res.status(404).json({
        success: false,
        error: 'Commission tier not found'
      });
    }

    res.json({ success: true, data: deactivatedTier });
  } catch (error) {
    console.error('Error deactivating commission tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate commission tier'
    });
  }
});

// POST /api/crm/commission-tiers/:id/assign - Assign tier to agents
router.post('/:id/assign', async (req, res) => {
  try {
    const tierId = req.params.id;
    const { agentIds } = req.body;

    if (!Array.isArray(agentIds) || agentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Agent IDs array is required'
      });
    }

    // Validate tier exists and is active
    const [tier] = await db.select()
      .from(commissionTiers)
      .where(and(
        eq(commissionTiers.id, tierId),
        eq(commissionTiers.isActive, true)
      ))
      .limit(1);

    if (!tier) {
      return res.status(400).json({
        success: false,
        error: 'Commission tier not found or inactive'
      });
    }

    // Validate agents exist
    const existingAgents = await db.select()
      .from(agents)
      .where(sql`${agents.id} = ANY(${agentIds})`);

    if (existingAgents.length !== agentIds.length) {
      return res.status(400).json({
        success: false,
        error: 'One or more agents not found'
      });
    }

    // Update agents to assign them to this tier
    await db.update(agents)
      .set({
        commissionTierId: tierId,
        updatedAt: new Date()
      })
      .where(sql`${agents.id} = ANY(${agentIds})`);

    res.json({
      success: true,
      data: {
        assignedCount: agentIds.length,
        tierName: tier.tierName
      }
    });
  } catch (error) {
    console.error('Error assigning tier to agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign tier to agents'
    });
  }
});

// POST /api/crm/commission-tiers/:id/calculate - Calculate tier impact preview
router.post('/:id/calculate', async (req, res) => {
  try {
    const tierId = req.params.id;
    const { samplePremium, policyType } = req.body;

    if (!samplePremium || !policyType) {
      return res.status(400).json({
        success: false,
        error: 'samplePremium and policyType are required'
      });
    }

    // Get tier details
    const [tier] = await db.select()
      .from(commissionTiers)
      .where(eq(commissionTiers.id, tierId))
      .limit(1);

    if (!tier) {
      return res.status(404).json({
        success: false,
        error: 'Commission tier not found'
      });
    }

    // Calculate commission for different scenarios
    let commissionRate = tier.baseRate;

    switch (policyType) {
      case 'individual':
        commissionRate = tier.individualRate || tier.baseRate;
        break;
      case 'corporate':
        commissionRate = tier.corporateRate || tier.baseRate;
        break;
      case 'family':
        commissionRate = tier.familyRate || tier.baseRate;
        break;
    }

    const baseCommission = samplePremium * (commissionRate / 100);
    const bonusCommission = samplePremium * ((tier.bonusRate || 0) / 100);
    const totalCommission = baseCommission + bonusCommission;

    // Get current agents in tier for context
    const tierAgents = await db.select()
      .from(agents)
      .where(eq(agents.commissionTierId, tierId));

    res.json({
      success: true,
      data: {
        tier: {
          name: tier.tierName,
          baseRate: tier.baseRate,
          bonusThreshold: tier.bonusThreshold,
          bonusRate: tier.bonusRate
        },
        calculation: {
          samplePremium,
          policyType,
          appliedRate: commissionRate,
          baseCommission: Math.round(baseCommission),
          bonusCommission: Math.round(bonusCommission),
          totalCommission: Math.round(totalCommission),
          commissionPercentage: (totalCommission / samplePremium) * 100
        },
        context: {
          currentAgentsInTier: tierAgents.length,
          averageAgentPerformance: tierAgents.length > 0 ?
            tierAgents.reduce((sum, agent) => sum + (agent.ytdPremium || 0), 0) / tierAgents.length : 0
        }
      }
    });
  } catch (error) {
    console.error('Error calculating tier impact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate tier impact'
    });
  }
});

export default router;