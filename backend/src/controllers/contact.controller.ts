import { Request, Response } from 'express';
import prisma from '../config/database';
import { ContactType } from '@prisma/client';

/**
 * GET /api/contacts
 * Get all contacts with filters, search, and pagination
 */
export const getContacts = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      search = '',
      type,
      excludeLeads,
      status,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    // Search filter (name, email, phone) - SQLite doesn't support mode: 'insensitive'
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { email: { contains: search as string } },
        { phone: { contains: search as string } },
        { mobile: { contains: search as string } },
      ];
    }

    // Type filter
    if (type) {
      where.type = type as ContactType;
    } else if (excludeLeads === 'true') {
      // Exclude LEAD type from results (for anagrafica)
      where.type = {
        not: 'LEAD'
      };
    }

    // Always exclude contacts that are in the funnel (have funnel_stage)
    // These are managed in the Lead Board, not in Anagrafica
    where.funnelStage = null;

    // Status filter
    if (status) {
      where.status = status as string;
    }

    // Tags filter (search for contacts that have any of the specified tags)
    if (tags) {
      const tagsArray = (tags as string).split(',');
      where.tags = {
        some: {
          tag: {
            in: tagsArray,
          },
        },
      };
    }

    // Get total count
    const total = await prisma.contact.count({ where });

    // Get stats by type (overall, not filtered) - exclude funnel leads
    const totalCollaborations = await prisma.contact.count({ where: { type: 'COLLABORATION', funnelStage: null } });
    const totalUsefulContacts = await prisma.contact.count({ where: { type: 'USEFUL_CONTACT', funnelStage: null } });
    const totalClients = await prisma.contact.count({ where: { type: 'CLIENT', funnelStage: null } });
    const totalProspects = await prisma.contact.count({ where: { type: 'PROSPECT', funnelStage: null } });

    // Get contacts with relations
    const contacts = await prisma.contact.findMany({
      where,
      include: {
        tags: true,
        socials: true,
        customFields: true,
      },
      orderBy: {
        [sortBy as string]: sortOrder as 'asc' | 'desc',
      },
      skip,
      take: limitNum,
    });

    res.json({
      success: true,
      data: {
        contacts,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
        stats: {
          totalCollaborations,
          totalUsefulContacts,
          totalClients,
          totalProspects,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei contatti',
      error: error.message,
    });
  }
};

/**
 * GET /api/contacts/:id
 * Get a single contact by ID
 */
export const getContactById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const contact = await prisma.contact.findUnique({
      where: { id: parseInt(id) },
      include: {
        tags: true,
        socials: true,
        customFields: true,
      },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contatto non trovato',
      });
    }

    res.json({
      success: true,
      data: contact,
    });
  } catch (error: any) {
    console.error('Error getting contact:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero del contatto',
      error: error.message,
    });
  }
};

/**
 * POST /api/contacts
 * Create a new contact
 */
export const createContact = async (req: Request, res: Response) => {
  try {
    const {
      name,
      type = 'LEAD',
      email,
      phone,
      mobile,
      address,
      city,
      province,
      zipCode,
      country = 'IT',
      partitaIva,
      codiceFiscale,
      website,
      notes,
      priority = 0,
      status = 'active',
      funnelStage,
      funnelValue,
      leadSource,
      tags = [],
      socials = [],
      customFields = [],
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Il nome è obbligatorio',
      });
    }

    // Create contact with relations
    const contact = await prisma.contact.create({
      data: {
        name,
        type: type as ContactType,
        email,
        phone,
        mobile,
        address,
        city,
        province,
        zipCode,
        country,
        partitaIva,
        codiceFiscale,
        website,
        notes,
        priority,
        status,
        funnelStage,
        funnelValue: funnelValue ? parseFloat(funnelValue) : null,
        leadSource,
        tags: {
          create: tags.map((tag: any) => ({
            tag: tag.tag || tag,
            color: tag.color || '#3b82f6',
          })),
        },
        socials: {
          create: socials.map((social: any) => ({
            platform: social.platform,
            url: social.url,
            username: social.username,
          })),
        },
        customFields: {
          create: customFields.map((field: any) => ({
            fieldName: field.fieldName,
            fieldValue: field.fieldValue,
            fieldType: field.fieldType || 'text',
          })),
        },
      },
      include: {
        tags: true,
        socials: true,
        customFields: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Contatto creato con successo',
      data: contact,
    });
  } catch (error: any) {
    console.error('Error creating contact:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella creazione del contatto',
      error: error.message,
    });
  }
};

/**
 * PUT /api/contacts/:id
 * Update a contact
 */
export const updateContact = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      email,
      phone,
      mobile,
      address,
      city,
      province,
      zipCode,
      country,
      partitaIva,
      codiceFiscale,
      website,
      notes,
      priority,
      status,
      funnelStage,
      funnelValue,
      leadSource,
      tags,
      socials,
      customFields,
    } = req.body;

    // Check if contact exists
    const existingContact = await prisma.contact.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingContact) {
      return res.status(404).json({
        success: false,
        message: 'Contatto non trovato',
      });
    }

    // Update contact data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type as ContactType;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (mobile !== undefined) updateData.mobile = mobile;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (province !== undefined) updateData.province = province;
    if (zipCode !== undefined) updateData.zipCode = zipCode;
    if (country !== undefined) updateData.country = country;
    if (partitaIva !== undefined) updateData.partitaIva = partitaIva;
    if (codiceFiscale !== undefined) updateData.codiceFiscale = codiceFiscale;
    if (website !== undefined) updateData.website = website;
    if (notes !== undefined) updateData.notes = notes;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (funnelStage !== undefined) updateData.funnelStage = funnelStage;
    if (funnelValue !== undefined) updateData.funnelValue = funnelValue ? parseFloat(funnelValue) : null;
    if (leadSource !== undefined) updateData.leadSource = leadSource;

    // Handle tags update (delete old, create new)
    if (tags !== undefined) {
      await prisma.contactTag.deleteMany({
        where: { contactId: parseInt(id) },
      });
      updateData.tags = {
        create: tags.map((tag: any) => ({
          tag: tag.tag || tag,
          color: tag.color || '#3b82f6',
        })),
      };
    }

    // Handle socials update
    if (socials !== undefined) {
      await prisma.contactSocial.deleteMany({
        where: { contactId: parseInt(id) },
      });
      updateData.socials = {
        create: socials.map((social: any) => ({
          platform: social.platform,
          url: social.url,
          username: social.username,
        })),
      };
    }

    // Handle custom fields update
    if (customFields !== undefined) {
      await prisma.contactCustomField.deleteMany({
        where: { contactId: parseInt(id) },
      });
      updateData.customFields = {
        create: customFields.map((field: any) => ({
          fieldName: field.fieldName,
          fieldValue: field.fieldValue,
          fieldType: field.fieldType || 'text',
        })),
      };
    }

    const contact = await prisma.contact.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        tags: true,
        socials: true,
        customFields: true,
      },
    });

    res.json({
      success: true,
      message: 'Contatto aggiornato con successo',
      data: contact,
    });
  } catch (error: any) {
    console.error('Error updating contact:', error);
    res.status(500).json({
      success: false,
      message: "Errore nell'aggiornamento del contatto",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/contacts/:id
 * Delete a contact
 */
export const deleteContact = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if contact exists
    const contact = await prisma.contact.findUnique({
      where: { id: parseInt(id) },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contatto non trovato',
      });
    }

    // Delete contact (tags, socials, and custom fields will be deleted automatically due to cascade)
    await prisma.contact.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Contatto eliminato con successo',
    });
  } catch (error: any) {
    console.error('Error deleting contact:', error);
    res.status(500).json({
      success: false,
      message: "Errore nell'eliminazione del contatto",
      error: error.message,
    });
  }
};

/**
 * GET /api/contacts/tags/all
 * Get all unique tags used across contacts
 */
export const getAllTags = async (req: Request, res: Response) => {
  try {
    const tags = await prisma.contactTag.findMany({
      distinct: ['tag'],
      select: {
        tag: true,
        color: true,
      },
      orderBy: {
        tag: 'asc',
      },
    });

    // Group by tag name and get the most used color for each tag
    const uniqueTags = tags.reduce((acc: Array<{ tag: string; color: string | null }>, current: any) => {
      const existing = acc.find((t) => t.tag === current.tag);
      if (!existing) {
        acc.push(current);
      }
      return acc;
    }, []);

    res.json({
      success: true,
      data: uniqueTags,
    });
  } catch (error: any) {
    console.error('Error getting tags:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei tags',
      error: error.message,
    });
  }
};
