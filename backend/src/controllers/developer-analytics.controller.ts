import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Verify the caller is a DEVELOPER. Returns the user id or null.
async function requireDeveloper(req: AuthRequest, res: Response): Promise<number | null> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Non autenticato' });
    return null;
  }
  const u = await prisma.user.findUnique({ where: { id: req.user.userId } });
  if (!u || u.role !== 'DEVELOPER') {
    res.status(403).json({ success: false, message: 'Riservato agli sviluppatori' });
    return null;
  }
  return u.id;
}

const EXCL = "(COALESCE(client_name,'') NOT LIKE '%DIEFFE%' AND COALESCE(client_name,'') NOT LIKE '%MISMO%')";

/**
 * Private company analytics (DEVELOPER only).
 * Excludes DIEFFE BROS and MISMO by request.
 */
export const getAnalytics = async (req: AuthRequest, res: Response) => {
  const userId = await requireDeveloper(req, res);
  if (userId === null) return;

  try {
    // --- Totals ---
    const invTotals = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        ROUND(SUM(CASE WHEN status='PAID' AND ${EXCL} THEN total ELSE 0 END),2) AS paidRevenue,
        ROUND(SUM(CASE WHEN status='ISSUED' AND ${EXCL} THEN total ELSE 0 END),2) AS issued,
        ROUND(SUM(CASE WHEN status='DRAFT' AND ${EXCL} THEN total ELSE 0 END),2) AS draft
      FROM invoices
    `);

    const expTotals = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        ROUND(SUM(CASE WHEN type='EXPENSE' THEN amount ELSE 0 END),2) AS expenses,
        ROUND(SUM(CASE WHEN type='INCOME' THEN amount ELSE 0 END),2) AS income
      FROM transactions
    `);

    const nonOp = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        ROUND(SUM(CASE WHEN tc.name='Tasse' THEN t.amount ELSE 0 END),2) AS taxes,
        ROUND(SUM(CASE WHEN tc.name='Altri Ricavi' THEN t.amount ELSE 0 END),2) AS migration
      FROM transactions t LEFT JOIN transaction_categories tc ON tc.id=t.category_id
      WHERE t.type='EXPENSE'
    `);

    // --- Hours ---
    const eventH = await prisma.$queryRawUnsafe<any[]>(`
      SELECT ROUND(SUM(TIMESTAMPDIFF(MINUTE,start_datetime,end_datetime))/60,1) AS eventHours
      FROM events
      WHERE is_all_day=0 AND (contact_id IS NULL OR contact_id NOT IN (SELECT id FROM contacts WHERE name LIKE '%DIEFFE%' OR name LIKE '%MISMO%'))
    `);

    const taskH = await prisma.$queryRawUnsafe<any[]>(`
      SELECT ROUND(SUM(estimated_hours),1) AS taskEstHours
      FROM tasks
      WHERE client_id IS NULL OR client_id NOT IN (SELECT id FROM contacts WHERE name LIKE '%DIEFFE%' OR name LIKE '%MISMO%')
    `);

    const nClients = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(DISTINCT COALESCE(contact_id, client_name)) AS n FROM invoices WHERE status='PAID'
    `);

    // --- Yearly ---
    const yearlyRev = await prisma.$queryRawUnsafe<any[]>(`
      SELECT YEAR(issue_date) y, COUNT(*) n, ROUND(SUM(total),2) revenue
      FROM invoices WHERE status='PAID' AND ${EXCL} GROUP BY y ORDER BY y
    `);
    const yearlyExp = await prisma.$queryRawUnsafe<any[]>(`
      SELECT YEAR(date) y,
        ROUND(SUM(CASE WHEN type='EXPENSE' THEN amount ELSE 0 END),2) expenses,
        ROUND(SUM(CASE WHEN type='INCOME' THEN amount ELSE 0 END),2) income
      FROM transactions GROUP BY y ORDER BY y
    `);

    // --- Monthly ---
    const monthlyRev = await prisma.$queryRawUnsafe<any[]>(`
      SELECT DATE_FORMAT(issue_date,'%Y-%m') m, ROUND(SUM(total),2) revenue
      FROM invoices WHERE status='PAID' AND ${EXCL} GROUP BY m ORDER BY m
    `);
    const monthlyExp = await prisma.$queryRawUnsafe<any[]>(`
      SELECT DATE_FORMAT(date,'%Y-%m') m, ROUND(SUM(CASE WHEN type='EXPENSE' THEN amount ELSE 0 END),2) expenses
      FROM transactions GROUP BY m ORDER BY m
    `);

    // --- Per client ---
    const clientRev = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COALESCE(c.name,i.client_name) cliente, ROUND(SUM(i.total),2) revenue
      FROM invoices i LEFT JOIN contacts c ON c.id=i.contact_id
      WHERE i.status='PAID' AND COALESCE(c.name,i.client_name) NOT LIKE '%DIEFFE%' AND COALESCE(c.name,i.client_name) NOT LIKE '%MISMO%'
      GROUP BY cliente ORDER BY revenue DESC
    `);
    const clientEventH = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COALESCE(c.name,'(senza contatto)') cliente, ROUND(SUM(TIMESTAMPDIFF(MINUTE,e.start_datetime,e.end_datetime))/60,1) hours
      FROM events e LEFT JOIN contacts c ON c.id=e.contact_id
      WHERE e.is_all_day=0 AND (c.name IS NULL OR (c.name NOT LIKE '%DIEFFE%' AND c.name NOT LIKE '%MISMO%'))
      GROUP BY cliente
    `);
    const clientTaskH = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COALESCE(c.name,'(senza contatto)') cliente, ROUND(SUM(t.estimated_hours),1) hours
      FROM tasks t LEFT JOIN contacts c ON c.id=t.client_id
      WHERE (c.name IS NULL OR (c.name NOT LIKE '%DIEFFE%' AND c.name NOT LIKE '%MISMO%'))
      GROUP BY cliente
    `);

    // --- Overdue ---
    const overdue = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COALESCE(c.name,i.client_name) cliente, i.invoice_number num, ROUND(i.total,2) total, DATE(i.due_date) due, DATEDIFF(NOW(),i.due_date) overdue_days
      FROM invoices i LEFT JOIN contacts c ON c.id=i.contact_id
      WHERE i.status='ISSUED' AND COALESCE(c.name,i.client_name) NOT LIKE '%DIEFFE%' AND COALESCE(c.name,i.client_name) NOT LIKE '%MISMO%'
      ORDER BY overdue_days DESC
    `);

    // --- Time by category ---
    const timeByCategory = await prisma.$queryRawUnsafe<any[]>(`
      SELECT IFNULL(ec.name,'(altra)') category, COUNT(e.id) events, ROUND(SUM(TIMESTAMPDIFF(MINUTE,e.start_datetime,e.end_datetime))/60,1) hours
      FROM events e LEFT JOIN event_categories ec ON ec.id=e.category_id
      WHERE e.is_all_day=0 AND (e.contact_id IS NULL OR e.contact_id NOT IN (SELECT id FROM contacts WHERE name LIKE '%DIEFFE%' OR name LIKE '%MISMO%'))
      GROUP BY ec.name ORDER BY hours DESC
    `);

    // --- Expense by category ---
    const expenseByCategory = await prisma.$queryRawUnsafe<any[]>(`
      SELECT IFNULL(tc.name,'(altra)') category, COUNT(t.id) n, ROUND(SUM(t.amount),2) total
      FROM transactions t LEFT JOIN transaction_categories tc ON tc.id=t.category_id
      WHERE t.type='EXPENSE' GROUP BY tc.name ORDER BY total DESC
    `);

    // --- Merge per-client ---
    const eh = new Map<string, number>();
    clientEventH.forEach((r: any) => eh.set(r.cliente, Number(r.hours) || 0));
    const th = new Map<string, number>();
    clientTaskH.forEach((r: any) => th.set(r.cliente, Number(r.hours) || 0));

    const clients = clientRev.map((r: any) => {
      const revenue = Number(r.revenue) || 0;
      const eventHours = eh.get(r.cliente) || 0;
      const taskEstHours = th.get(r.cliente) || 0;
      return {
        name: r.cliente,
        revenue,
        eventHours,
        taskEstHours,
        euroPerHour: eventHours > 0 ? Math.round((revenue / eventHours) * 10) / 10 : null,
      };
    });

    const paid = Number(invTotals[0]?.paidRevenue) || 0;
    const issued = Number(invTotals[0]?.issued) || 0;
    const draft = Number(invTotals[0]?.draft) || 0;
    const expenses = Number(expTotals[0]?.expenses) || 0;
    const income = Number(expTotals[0]?.income) || 0;
    const taxes = Number(nonOp[0]?.taxes) || 0;
    const migration = Number(nonOp[0]?.migration) || 0;
    const opExpenses = expenses - taxes - migration;
    const ebitda = paid - opExpenses;
    const margin = paid - expenses;

    res.json({
      success: true,
      data: {
        totals: {
          paidRevenue: paid,
          issued,
          draft,
          expenses,
          income,
          margin,
          ebitda,
          taxes,
          migration,
          clients: Number(nClients[0]?.n) || 0,
          eventHours: Number(eventH[0]?.eventHours) || 0,
          taskEstHours: Number(taskH[0]?.taskEstHours) || 0,
        },
        yearly: yearlyRev.map((r: any) => ({
          year: r.y,
          revenue: Number(r.revenue) || 0,
          expenses: Number((yearlyExp.find((e: any) => e.y === r.y) || {}).expenses) || 0,
        })),
        monthly: monthlyRev.map((r: any) => {
          const ex = monthlyExp.find((e: any) => e.m === r.m);
          return { month: r.m, revenue: Number(r.revenue) || 0, expenses: Number(ex?.expenses) || 0 };
        }),
        clients,
        overdue: overdue.map((r: any) => ({ client: r.cliente, invoiceNumber: r.num, total: Number(r.total) || 0, dueDate: r.due, overdueDays: Number(r.overdue_days) || 0 })),
        timeByCategory: timeByCategory.map((r: any) => ({ category: r.category, events: Number(r.events) || 0, hours: Number(r.hours) || 0 })),
        expenseByCategory: expenseByCategory.map((r: any) => ({ category: r.category, count: Number(r.n) || 0, total: Number(r.total) || 0 })),
      },
    });
  } catch (e: any) {
    console.error('[analytics] error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
};
