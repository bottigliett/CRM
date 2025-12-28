import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * GET /api/payment-methods
 * Get all payment methods
 */
export const getPaymentMethods = async (req: Request, res: Response) => {
  try {
    const { includeInactive } = req.query;

    const where: any = {};

    if (!includeInactive || includeInactive === 'false') {
      where.isActive = true;
    }

    const paymentMethods = await prisma.paymentMethod.findMany({
      where,
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({
      success: true,
      data: paymentMethods,
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods',
    });
  }
};

/**
 * GET /api/payment-methods/:id
 * Get single payment method by ID
 */
export const getPaymentMethodById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found',
      });
    }

    res.json({
      success: true,
      data: paymentMethod,
    });
  } catch (error) {
    console.error('Error fetching payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment method',
    });
  }
};

/**
 * POST /api/payment-methods
 * Create new payment method
 */
export const createPaymentMethod = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        name,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Payment method created successfully',
      data: paymentMethod,
    });
  } catch (error) {
    console.error('Error creating payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment method',
    });
  }
};

/**
 * PUT /api/payment-methods/:id
 * Update payment method
 */
export const updatePaymentMethod = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    // Check if payment method exists
    const existing = await prisma.paymentMethod.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found',
      });
    }

    const paymentMethod = await prisma.paymentMethod.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      success: true,
      message: 'Payment method updated successfully',
      data: paymentMethod,
    });
  } catch (error) {
    console.error('Error updating payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment method',
    });
  }
};

/**
 * DELETE /api/payment-methods/:id
 * Delete payment method
 */
export const deletePaymentMethod = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if payment method exists
    const existing = await prisma.paymentMethod.findUnique({
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
        message: 'Payment method not found',
      });
    }

    // Check if payment method has transactions
    if (existing._count.transactions > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete payment method with existing transactions',
      });
    }

    await prisma.paymentMethod.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Payment method deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment method',
    });
  }
};
