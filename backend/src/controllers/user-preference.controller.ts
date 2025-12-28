import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * GET /api/user-preferences/:pageName
 * Get user preferences for a specific page
 */
export const getUserPreferences = async (req: Request, res: Response) => {
  try {
    const { pageName } = req.params;
    const userId = (req as any).user?.userId || 1; // Default to user 1 for now

    console.log('[getUserPreferences] Loading preferences for:', { userId, pageName });

    const preferences = await prisma.userPagePreference.findUnique({
      where: {
        userId_pageName: {
          userId,
          pageName,
        },
      },
    });

    console.log('[getUserPreferences] Found preferences:', preferences);

    res.json({
      success: true,
      data: preferences || null,
    });
  } catch (error: any) {
    console.error('[getUserPreferences] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Errore nel recupero delle preferenze',
    });
  }
};

/**
 * PUT /api/user-preferences/:pageName
 * Save or update user preferences for a specific page
 */
export const saveUserPreferences = async (req: Request, res: Response) => {
  try {
    const { pageName } = req.params;
    const userId = (req as any).user?.userId || 1; // Default to user 1 for now
    const { viewMode, pageLimit, typeFilter } = req.body;

    console.log('[saveUserPreferences] Saving preferences:', { userId, pageName, viewMode, pageLimit, typeFilter });

    const preferences = await prisma.userPagePreference.upsert({
      where: {
        userId_pageName: {
          userId,
          pageName,
        },
      },
      create: {
        userId,
        pageName,
        viewMode,
        pageLimit,
        typeFilter,
      },
      update: {
        viewMode,
        pageLimit,
        typeFilter,
      },
    });

    console.log('[saveUserPreferences] Saved successfully:', preferences);

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error: any) {
    console.error('[saveUserPreferences] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Errore nel salvataggio delle preferenze',
    });
  }
};
