import { Request, Response } from 'express';
import prisma from '../config/database';
import { TransactionType } from '@prisma/client';

/**
 * GET /api/transactions/categories/all
 * Get all transaction categories
 */
export const getTransactionCategories = async (req: Request, res: Response) => {
  try {
    const { type, includeInactive } = req.query;

    const where: any = {};

    if (type) {
      where.type = type as TransactionType;
    }

    if (!includeInactive || includeInactive === 'false') {
      where.isActive = true;
    }

    const categories = await prisma.transactionCategory.findMany({
      where,
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Error fetching transaction categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction categories',
    });
  }
};

/**
 * GET /api/transactions/categories/:id
 * Get single transaction category by ID
 */
export const getTransactionCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await prisma.transactionCategory.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Transaction category not found',
      });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Error fetching transaction category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction category',
    });
  }
};

/**
 * POST /api/transactions/categories
 * Create new transaction category
 */
export const createTransactionCategory = async (req: Request, res: Response) => {
  try {
    const { name, type, icon, color } = req.body;

    // Validation
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name and type are required',
      });
    }

    if (!['INCOME', 'EXPENSE'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be INCOME or EXPENSE',
      });
    }

    const category = await prisma.transactionCategory.create({
      data: {
        name,
        type: type as TransactionType,
        icon,
        color,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Transaction category created successfully',
      data: category,
    });
  } catch (error) {
    console.error('Error creating transaction category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction category',
    });
  }
};

/**
 * PUT /api/transactions/categories/:id
 * Update transaction category
 */
export const updateTransactionCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, icon, color, isActive } = req.body;

    // Check if category exists
    const existing = await prisma.transactionCategory.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Transaction category not found',
      });
    }

    // Validation
    if (type && !['INCOME', 'EXPENSE'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be INCOME or EXPENSE',
      });
    }

    const category = await prisma.transactionCategory.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(type && { type: type as TransactionType }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      success: true,
      message: 'Transaction category updated successfully',
      data: category,
    });
  } catch (error) {
    console.error('Error updating transaction category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction category',
    });
  }
};

/**
 * DELETE /api/transactions/categories/:id
 * Delete transaction category
 */
export const deleteTransactionCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const existing = await prisma.transactionCategory.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Transaction category not found',
      });
    }

    // Check if category has transactions
    if (existing._count.transactions > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with existing transactions',
      });
    }

    await prisma.transactionCategory.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Transaction category deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting transaction category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transaction category',
    });
  }
};
