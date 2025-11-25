import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import {
  providerPerformanceMetrics,
  providerQualityScores,
  providerFinancialPerformance,
  medicalInstitutions,
  insertProviderPerformanceMetricSchema,
  insertProviderQualityScoreSchema,
  insertProviderFinancialPerformanceSchema,
  providerPerformanceTierEnum
} from '../shared/schema';
import { providerPerformanceService } from '../services/providerPerformanceService';

const router = Router();

// GET /api/provider-performance/metrics - Get performance metrics
router.get('/metrics', async (req, res) => {
  try {
    const { institutionId, category, period, tier } = req.query;

    let query = db.select({
      metric: providerPerformanceMetrics,
      institution: medicalInstitutions
    })
    .from(providerPerformanceMetrics)
    .leftJoin(medicalInstitutions, eq(providerPerformanceMetrics.institutionId, medicalInstitutions.id));

    // Apply filters
    if (institutionId) {
      query = query.where(eq(providerPerformanceMetrics.institutionId, parseInt(institutionId as string)));
    }
    if (category) {
      query = query.where(eq(providerPerformanceMetrics.metricCategory, category as string));
    }
    if (period) {
      query = query.where(eq(providerPerformanceMetrics.measurementPeriod, period as string));
    }
    if (tier) {
      query = query.where(eq(providerPerformanceMetrics.performanceTier, tier as string));
    }

    const metrics = await query
      .orderBy(providerPerformanceMetrics.measurementDate, providerPerformanceMetrics.metricCategory);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance metrics'
    });
  }
});

// POST /api/provider-performance/metrics - Add performance metric
router.post('/metrics', async (req, res) => {
  try {
    const validatedData = insertProviderPerformanceMetricSchema.parse(req.body);

    // Calculate performance tier based on value and threshold
    const performanceTier = providerPerformanceService.calculatePerformanceTier(
      validatedData.metricValue,
      validatedData.performanceThreshold
    );

    const [newMetric] = await db.insert(providerPerformanceMetrics)
      .values({
        ...validatedData,
        performanceTier
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newMetric
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error creating performance metric:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create performance metric'
    });
  }
});

// GET /api/provider-performance/quality-scores - Get quality scores
router.get('/quality-scores', async (req, res) => {
  try {
    const { institutionId, period, tier } = req.query;

    let query = db.select({
      score: providerQualityScores,
      institution: medicalInstitutions
    })
    .from(providerQualityScores)
    .leftJoin(medicalInstitutions, eq(providerQualityScores.institutionId, medicalInstitutions.id));

    // Apply filters
    if (institutionId) {
      query = query.where(eq(providerQualityScores.institutionId, parseInt(institutionId as string)));
    }
    if (period) {
      query = query.where(eq(providerQualityScores.assessmentPeriod, period as string));
    }
    if (tier) {
      query = query.where(eq(providerQualityScores.qualityTier, tier as string));
    }

    const qualityScores = await query
      .orderBy(providerQualityScores.assessmentDate);

    res.json({
      success: true,
      data: qualityScores
    });
  } catch (error) {
    console.error('Error fetching quality scores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quality scores'
    });
  }
});

// POST /api/provider-performance/quality-scores - Add quality score assessment
router.post('/quality-scores', async (req, res) => {
  try {
    const validatedData = insertProviderQualityScoreSchema.parse(req.body);

    // Calculate quality tier based on overall score
    const qualityTier = providerPerformanceService.calculateQualityTier(
      validatedData.overallQualityScore
    );

    const [newQualityScore] = await db.insert(providerQualityScores)
      .values({
        ...validatedData,
        qualityTier
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newQualityScore
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error creating quality score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create quality score'
    });
  }
});

// GET /api/provider-performance/financial-performance - Get financial performance
router.get('/financial-performance', async (req, res) => {
  try {
    const { institutionId, period, stability } = req.query;

    let query = db.select({
      financial: providerFinancialPerformance,
      institution: medicalInstitutions
    })
    .from(providerFinancialPerformance)
    .leftJoin(medicalInstitutions, eq(providerFinancialPerformance.institutionId, medicalInstitutions.id));

    // Apply filters
    if (institutionId) {
      query = query.where(eq(providerFinancialPerformance.institutionId, parseInt(institutionId as string)));
    }
    if (period) {
      query = query.where(eq(providerFinancialPerformance.reportingPeriod, period as string));
    }
    if (stability) {
      query = query.where(eq(providerFinancialPerformance.financialStability, stability as string));
    }

    const financialPerformance = await query
      .orderBy(providerFinancialPerformance.reportingPeriod);

    res.json({
      success: true,
      data: financialPerformance
    });
  } catch (error) {
    console.error('Error fetching financial performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch financial performance'
    });
  }
});

// POST /api/provider-performance/financial-performance - Add financial performance data
router.post('/financial-performance', async (req, res) => {
  try {
    const validatedData = insertProviderFinancialPerformanceSchema.parse(req.body);

    const [newFinancialPerformance] = await db.insert(providerFinancialPerformance)
      .values(validatedData)
      .returning();

    res.status(201).json({
      success: true,
      data: newFinancialPerformance
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error creating financial performance data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create financial performance data'
    });
  }
});

// GET /api/provider-performance/dashboard/:institutionId - Get performance dashboard for specific institution
router.get('/dashboard/:institutionId', async (req, res) => {
  try {
    const institutionId = parseInt(req.params.institutionId);
    const { period = 'quarterly' } = req.query;

    const dashboard = await providerPerformanceService.getPerformanceDashboard(institutionId, period as string);

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Error fetching performance dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance dashboard'
    });
  }
});

// GET /api/provider-performance/analytics - Get provider performance analytics
router.get('/analytics', async (req, res) => {
  try {
    const { period = 'quarterly', category, tier } = req.query;

    const analytics = await providerPerformanceService.getPerformanceAnalytics(
      period as string,
      category as string,
      tier as string
    );

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching performance analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance analytics'
    });
  }
});

// GET /api/provider-performance/benchmarking - Get benchmarking data
router.get('/benchmarking', async (req, res) => {
  try {
    const { category, tier } = req.query;

    const benchmarking = await providerPerformanceService.getBenchmarkingData(
      category as string,
      tier as string
    );

    res.json({
      success: true,
      data: benchmarking
    });
  } catch (error) {
    console.error('Error fetching benchmarking data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch benchmarking data'
    });
  }
});

// POST /api/provider-performance/batch-metrics - Add multiple metrics at once
router.post('/batch-metrics', async (req, res) => {
  try {
    const { metrics } = req.body;

    if (!Array.isArray(metrics) || metrics.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Metrics array is required'
      });
    }

    const results = [];

    for (const metricData of metrics) {
      const validatedData = insertProviderPerformanceMetricSchema.parse(metricData);

      const performanceTier = providerPerformanceService.calculatePerformanceTier(
        validatedData.metricValue,
        validatedData.performanceThreshold
      );

      const [newMetric] = await db.insert(providerPerformanceMetrics)
        .values({
          ...validatedData,
          performanceTier
        })
        .returning();

      results.push(newMetric);
    }

    res.status(201).json({
      success: true,
      data: results
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error creating batch metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create batch metrics'
    });
  }
});

// GET /api/provider-performance/trends/:institutionId - Get performance trends
router.get('/trends/:institutionId', async (req, res) => {
  try {
    const institutionId = parseInt(req.params.institutionId);
    const { metricCategory, months = 12 } = req.query;

    const trends = await providerPerformanceService.getPerformanceTrends(
      institutionId,
      metricCategory as string,
      parseInt(months as string)
    );

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Error fetching performance trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance trends'
    });
  }
});

// POST /api/provider-performance/comparative-analysis - Get comparative analysis between providers
router.post('/comparative-analysis', async (req, res) => {
  try {
    const { institutionIds, metricCategory, period } = req.body;

    if (!Array.isArray(institutionIds) || institutionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Institution IDs array is required'
      });
    }

    const comparison = await providerPerformanceService.getComparativeAnalysis(
      institutionIds,
      metricCategory,
      period
    );

    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Error performing comparative analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform comparative analysis'
    });
  }
});

// GET /api/provider-performance/performance-alerts - Get performance alerts
router.get('/performance-alerts', async (req, res) => {
  try {
    const { institutionId, severity } = req.query;

    const alerts = await providerPerformanceService.getPerformanceAlerts(
      institutionId ? parseInt(institutionId as string) : undefined,
      severity as string
    );

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error fetching performance alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance alerts'
    });
  }
});

// POST /api/provider-performance/improvement-plan - Generate improvement plan
router.post('/improvement-plan', async (req, res) => {
  try {
    const { institutionId, assessmentPeriod } = req.body;

    const improvementPlan = await providerPerformanceService.generateImprovementPlan(
      parseInt(institutionId),
      assessmentPeriod
    );

    res.json({
      success: true,
      data: improvementPlan
    });
  } catch (error) {
    console.error('Error generating improvement plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate improvement plan'
    });
  }
});

export default router;