import { Request, Response } from 'express';
import prisma from '../config/database';
import { TransactionType } from '@prisma/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

/**
 * GET /api/transactions
 * Get all transactions with filters and pagination
 */
export const getTransactions = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '50',
      type,
      categoryId,
      contactId,
      paymentMethodId,
      startDate,
      endDate,
      search,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (type) {
      where.type = type as TransactionType;
    }

    if (categoryId) {
      where.categoryId = parseInt(categoryId as string);
    }

    if (contactId) {
      where.contactId = parseInt(contactId as string);
    }

    if (paymentMethodId) {
      where.paymentMethodId = parseInt(paymentMethodId as string);
    }

    // Date range filter
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.date.lte = new Date(endDate as string);
      }
    }

    // Search in description
    if (search) {
      where.description = {
        contains: search as string,
      };
    }

    // Get transactions with relations
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: true,
          paymentMethod: true,
          contact: {
            select: {
              id: true,
              name: true,
              email: true,
              type: true,
            },
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limitNum,
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
    });
  }
};

/**
 * GET /api/transactions/:id
 * Get single transaction by ID
 */
export const getTransactionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id) },
      include: {
        category: true,
        paymentMethod: true,
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            type: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction',
    });
  }
};

/**
 * POST /api/transactions
 * Create new transaction
 */
export const createTransaction = async (req: Request, res: Response) => {
  try {
    const {
      type,
      amount,
      date,
      categoryId,
      paymentMethodId,
      contactId,
      description,
      invoiceId,
    } = req.body;

    // Validation
    if (!type || !amount || !date) {
      return res.status(400).json({
        success: false,
        message: 'Type, amount, and date are required',
      });
    }

    if (!['INCOME', 'EXPENSE'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be INCOME or EXPENSE',
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
      });
    }

    // Get user ID from request or find first user
    let userId = (req as any).user?.id;
    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      userId = firstUser?.id || 2; // Fallback to ID 2
    }

    const transaction = await prisma.transaction.create({
      data: {
        type: type as TransactionType,
        amount: parseFloat(amount),
        date: new Date(date),
        categoryId: categoryId ? parseInt(categoryId) : null,
        paymentMethodId: paymentMethodId ? parseInt(paymentMethodId) : null,
        contactId: contactId ? parseInt(contactId) : null,
        description,
        invoiceId: invoiceId ? parseInt(invoiceId) : null,
        createdBy: userId,
      },
      include: {
        category: true,
        paymentMethod: true,
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            type: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction,
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction',
    });
  }
};

/**
 * PUT /api/transactions/:id
 * Update transaction
 */
export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      type,
      amount,
      date,
      categoryId,
      paymentMethodId,
      contactId,
      description,
      invoiceId,
    } = req.body;

    // Check if transaction exists
    const existing = await prisma.transaction.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    // Validation
    if (type && !['INCOME', 'EXPENSE'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be INCOME or EXPENSE',
      });
    }

    if (amount !== undefined && amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
      });
    }

    const transaction = await prisma.transaction.update({
      where: { id: parseInt(id) },
      data: {
        ...(type && { type: type as TransactionType }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(date && { date: new Date(date) }),
        ...(categoryId !== undefined && { categoryId: categoryId ? parseInt(categoryId) : null }),
        ...(paymentMethodId !== undefined && { paymentMethodId: paymentMethodId ? parseInt(paymentMethodId) : null }),
        ...(contactId !== undefined && { contactId: contactId ? parseInt(contactId) : null }),
        ...(description !== undefined && { description }),
        ...(invoiceId !== undefined && { invoiceId: invoiceId ? parseInt(invoiceId) : null }),
      },
      include: {
        category: true,
        paymentMethod: true,
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            type: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: transaction,
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction',
    });
  }
};

/**
 * DELETE /api/transactions/:id
 * Delete transaction
 */
export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if transaction exists
    const existing = await prisma.transaction.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    await prisma.transaction.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transaction',
    });
  }
};

/**
 * GET /api/transactions/stats/summary
 * Get financial statistics summary
 */
export const getTransactionStats = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, period = 'all' } = req.query;

    let start: Date | undefined;
    let end: Date | undefined;
    let whereClause: any = {};

    // Determine date range
    if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
      whereClause.date = {
        gte: start,
        lte: end,
      };
    } else if (period === 'month') {
      // Current month only
      const now = new Date();
      start = startOfMonth(now);
      end = endOfMonth(now);
      whereClause.date = {
        gte: start,
        lte: end,
      };
    } else {
      // Default to ALL TIME - no date filter
      start = undefined;
      end = undefined;
    }

    // Get transactions for the period
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        category: true,
      },
    });

    // Calculate totals
    const income = transactions
      .filter((t: any) => t.type === TransactionType.INCOME)
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const expenses = transactions
      .filter((t: any) => t.type === TransactionType.EXPENSE)
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const balance = income - expenses;

    // Get category breakdown
    const categoryBreakdown = transactions.reduce((acc: any, t: any) => {
      if (t.category) {
        const key = t.category.name;
        if (!acc[key]) {
          acc[key] = {
            name: t.category.name,
            type: t.type,
            color: t.category.color,
            total: 0,
            count: 0,
          };
        }
        acc[key].total += t.amount;
        acc[key].count += 1;
      }
      return acc;
    }, {});

    // Get previous period for comparison (only if we have a specific period)
    let incomeChange = 0;
    let expensesChange = 0;

    if (start && end) {
      const prevStart = period === 'month' ? startOfMonth(subMonths(start, 1)) : new Date(start.getTime() - (end.getTime() - start.getTime()));
      const prevEnd = period === 'month' ? endOfMonth(subMonths(end, 1)) : start;

      const prevTransactions = await prisma.transaction.findMany({
        where: {
          date: {
            gte: prevStart,
            lte: prevEnd,
          },
        },
      });

      const prevIncome = prevTransactions
        .filter((t: any) => t.type === TransactionType.INCOME)
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      const prevExpenses = prevTransactions
        .filter((t: any) => t.type === TransactionType.EXPENSE)
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      // Calculate percentage changes
      incomeChange = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : 0;
      expensesChange = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0;
    }

    res.json({
      success: true,
      data: {
        period: start && end ? {
          start: start.toISOString(),
          end: end.toISOString(),
        } : null,
        summary: {
          income,
          expenses,
          balance,
          incomeChange,
          expensesChange,
        },
        categoryBreakdown: Object.values(categoryBreakdown),
        transactionCount: {
          income: transactions.filter((t: any) => t.type === TransactionType.INCOME).length,
          expenses: transactions.filter((t: any) => t.type === TransactionType.EXPENSE).length,
          total: transactions.length,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction statistics',
    });
  }
};
