import { Router, Request, Response } from 'express';
import { db } from '../db';
import { companies, insertCompanySchema } from '../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Get all companies
router.get('/', async (req: Request, res: Response) => {
  try {
    const allCompanies = await db
      .select()
      .from(companies)
      .orderBy(desc(companies.createdAt));
    
    res.json(allCompanies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ message: 'Failed to fetch companies' });
  }
});

// Get company by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, parseInt(id)))
      .limit(1);
    
    if (company.length === 0) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    res.json(company[0]);
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ message: 'Failed to fetch company' });
  }
});

// Create new company
router.post('/', async (req: Request, res: Response) => {
  try {
    const validated = insertCompanySchema.parse(req.body);
    
    const result = await db
      .insert(companies)
      .values(validated)
      .returning();
    
    res.status(201).json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Error creating company:', error);
    res.status(500).json({ message: 'Failed to create company' });
  }
});

// Update company
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validated = insertCompanySchema.partial().parse(req.body);
    
    const result = await db
      .update(companies)
      .set(validated)
      .where(eq(companies.id, parseInt(id)))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    res.json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Error updating company:', error);
    res.status(500).json({ message: 'Failed to update company' });
  }
});

// Delete company
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await db
      .delete(companies)
      .where(eq(companies.id, parseInt(id)))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ message: 'Failed to delete company' });
  }
});

export default router;