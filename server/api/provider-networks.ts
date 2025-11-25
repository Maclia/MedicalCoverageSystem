import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import {
  providerNetworks,
  providerNetworkAssignments,
  medicalInstitutions,
  insertProviderNetworkSchema,
  insertProviderNetworkAssignmentSchema
} from '../shared/schema';

const router = Router();

// GET /api/provider-networks - List all provider networks
router.get('/', async (req, res) => {
  try {
    const networks = await db.select()
      .from(providerNetworks)
      .orderBy(providerNetworks.createdAt);

    res.json({ success: true, data: networks });
  } catch (error) {
    console.error('Error fetching provider networks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch provider networks'
    });
  }
});

// POST /api/provider-networks - Create new provider network
router.post('/', async (req, res) => {
  try {
    const validatedData = insertProviderNetworkSchema.parse(req.body);

    const [newNetwork] = await db.insert(providerNetworks)
      .values(validatedData)
      .returning();

    res.status(201).json({ success: true, data: newNetwork });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error creating provider network:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create provider network'
    });
  }
});

// GET /api/provider-networks/:id - Get specific network details
router.get('/:id', async (req, res) => {
  try {
    const networkId = parseInt(req.params.id);

    if (isNaN(networkId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid network ID'
      });
    }

    const [network] = await db.select()
      .from(providerNetworks)
      .where(providerNetworks.id.eq(networkId));

    if (!network) {
      return res.status(404).json({
        success: false,
        error: 'Provider network not found'
      });
    }

    res.json({ success: true, data: network });
  } catch (error) {
    console.error('Error fetching provider network:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch provider network'
    });
  }
});

// PUT /api/provider-networks/:id - Update provider network
router.put('/:id', async (req, res) => {
  try {
    const networkId = parseInt(req.params.id);

    if (isNaN(networkId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid network ID'
      });
    }

    const validatedData = insertProviderNetworkSchema.partial().parse(req.body);
    validatedData.updatedAt = new Date();

    const [updatedNetwork] = await db.update(providerNetworks)
      .set(validatedData)
      .where(providerNetworks.id.eq(networkId))
      .returning();

    if (!updatedNetwork) {
      return res.status(404).json({
        success: false,
        error: 'Provider network not found'
      });
    }

    res.json({ success: true, data: updatedNetwork });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error updating provider network:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update provider network'
    });
  }
});

// DELETE /api/provider-networks/:id - Delete provider network
router.delete('/:id', async (req, res) => {
  try {
    const networkId = parseInt(req.params.id);

    if (isNaN(networkId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid network ID'
      });
    }

    // Check if network has assigned providers
    const assignments = await db.select()
      .from(providerNetworkAssignments)
      .where(providerNetworkAssignments.networkId.eq(networkId))
      .limit(1);

    if (assignments.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete network with assigned providers'
      });
    }

    const [deletedNetwork] = await db.delete(providerNetworks)
      .where(providerNetworks.id.eq(networkId))
      .returning();

    if (!deletedNetwork) {
      return res.status(404).json({
        success: false,
        error: 'Provider network not found'
      });
    }

    res.json({ success: true, data: deletedNetwork });
  } catch (error) {
    console.error('Error deleting provider network:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete provider network'
    });
  }
});

// GET /api/provider-networks/:id/providers - List providers in network
router.get('/:id/providers', async (req, res) => {
  try {
    const networkId = parseInt(req.params.id);

    if (isNaN(networkId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid network ID'
      });
    }

    const assignments = await db.select({
      id: providerNetworkAssignments.id,
      institutionId: providerNetworkAssignments.institutionId,
      networkId: providerNetworkAssignments.networkId,
      effectiveDate: providerNetworkAssignments.effectiveDate,
      expiryDate: providerNetworkAssignments.expiryDate,
      isActive: providerNetworkAssignments.isActive,
      assignmentType: providerNetworkAssignments.assignmentType,
      coveredSpecializations: providerNetworkAssignments.coveredSpecializations,
      networkDiscount: providerNetworkAssignments.networkDiscount,
      specialTerms: providerNetworkAssignments.specialTerms,
      createdAt: providerNetworkAssignments.createdAt,
      // Institution details
      institutionName: medicalInstitutions.name,
      institutionType: medicalInstitutions.type,
      institutionAddress: medicalInstitutions.address,
      institutionContactPerson: medicalInstitutions.contactPerson,
      institutionContactEmail: medicalInstitutions.contactEmail,
      institutionContactPhone: medicalInstitutions.contactPhone
    })
      .from(providerNetworkAssignments)
      .leftJoin(medicalInstitutions, providerNetworkAssignments.institutionId.eq(medicalInstitutions.id))
      .where(providerNetworkAssignments.networkId.eq(networkId))
      .orderBy(providerNetworkAssignments.createdAt);

    res.json({ success: true, data: assignments });
  } catch (error) {
    console.error('Error fetching network providers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch network providers'
    });
  }
});

// POST /api/provider-networks/:id/providers - Add provider to network
router.post('/:id/providers', async (req, res) => {
  try {
    const networkId = parseInt(req.params.id);

    if (isNaN(networkId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid network ID'
      });
    }

    // Check if network exists
    const [network] = await db.select()
      .from(providerNetworks)
      .where(providerNetworks.id.eq(networkId));

    if (!network) {
      return res.status(404).json({
        success: false,
        error: 'Provider network not found'
      });
    }

    const assignmentData = {
      networkId,
      ...req.body
    };

    const validatedData = insertProviderNetworkAssignmentSchema.parse(assignmentData);

    // Check if provider already exists in network
    const existingAssignment = await db.select()
      .from(providerNetworkAssignments)
      .where(
        providerNetworkAssignments.networkId.eq(networkId).and(
          providerNetworkAssignments.institutionId.eq(validatedData.institutionId)
        )
      )
      .limit(1);

    if (existingAssignment.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Provider already exists in this network'
      });
    }

    const [newAssignment] = await db.insert(providerNetworkAssignments)
      .values(validatedData)
      .returning();

    res.status(201).json({ success: true, data: newAssignment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error adding provider to network:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add provider to network'
    });
  }
});

// DELETE /api/provider-networks/:id/providers/:providerId - Remove provider from network
router.delete('/:id/providers/:providerId', async (req, res) => {
  try {
    const networkId = parseInt(req.params.id);
    const providerId = parseInt(req.params.providerId);

    if (isNaN(networkId) || isNaN(providerId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid network ID or provider ID'
      });
    }

    const [deletedAssignment] = await db.delete(providerNetworkAssignments)
      .where(
        providerNetworkAssignments.networkId.eq(networkId).and(
          providerNetworkAssignments.institutionId.eq(providerId)
        )
      )
      .returning();

    if (!deletedAssignment) {
      return res.status(404).json({
        success: false,
        error: 'Provider assignment not found'
      });
    }

    res.json({ success: true, data: deletedAssignment });
  } catch (error) {
    console.error('Error removing provider from network:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove provider from network'
    });
  }
});

export default router;