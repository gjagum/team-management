import { Hono } from 'hono';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { authMiddleware, requirePermission } from '../middleware/auth.ts';
import { prisma } from '../index.ts';

const timesheetsRouter = new Hono();

timesheetsRouter.use('/*', authMiddleware);

// Helper: get employee record from the authenticated user's ID
async function getEmployeeByUserId(userId: number) {
  return prisma.employee.findUnique({ 
    where: { userId },
    include: {
      user: {
        select: { fullName: true, email: true },
      },
    },
  });
}

// Utility to parse "HH:mm" to minutes
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

// Utility to format currency without symbols (StandardFonts don't support special chars like ₱)
function formatCurrency(value: number, currency: string = 'PHP'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + ' ' + currency;
}

// Get timesheet data preview
timesheetsRouter.get('/preview', requirePermission('reports.view'), async (c: any) => {
  let employeeId = parseInt(c.req.query('employeeId') || '0');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  if (!startDate || !endDate) {
    return c.json({ error: 'Missing startDate or endDate' }, 400);
  }

  // Role-based filtering: Employees only see themselves
  if (c.user.role === 'EMPLOYEE') {
    const employee = await getEmployeeByUserId(c.user.userId);
    if (!employee) return c.json({ error: 'Employee profile not found' }, 404);
    employeeId = employee.id;
  } else if (!employeeId) {
    return c.json({ error: 'Missing employeeId' }, 400);
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      user: {
        select: { fullName: true, email: true },
      },
    },
  });

  if (!employee) return c.json({ error: 'Employee not found' }, 404);

  // Fetch Schedules
  const schedules = await prisma.schedule.findMany({
    where: {
      employeeId,
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    orderBy: { date: 'asc' },
  });

  // Fetch Approved Overtime
  const overtimes = await prisma.overtimeRecord.findMany({
    where: {
      employeeId,
      status: 'APPROVED',
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    orderBy: { date: 'asc' },
  });

  // Fetch Raw Time Logs (Clock In/Out)
  const timeLogs = await prisma.timeLog.findMany({
    where: {
      employeeId,
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    orderBy: { date: 'asc' },
  });

  // Get Settings
  const allSettings = await (prisma as any).appSettings.findMany();
  const settingsMap = new Map(allSettings.map((s: any) => [s.key, s.value]));
  
  const currency = settingsMap.get('company.currency') || 'PHP';
  const otMultiplier = parseFloat(settingsMap.get('overtime.rate_multiplier') || '1.5');
  const hourlyRate = Number(employee.salary || 0); // Assuming hourly rate for contractors

  // Aggregate Data
  const dailyLogs: Record<string, any> = {};

  schedules.forEach(s => {
    const dateStr = s.date.toISOString().split('T')[0];
    const durationMin = parseTimeToMinutes(s.endTime) - parseTimeToMinutes(s.startTime) - s.breakMinutes;
    const hours = Math.max(0, durationMin / 60);
    
    if (!dailyLogs[dateStr]) dailyLogs[dateStr] = { date: dateStr, regular: 0, overtime: 0, clockIn: null, clockOut: null, notes: s.notes || '' };
    dailyLogs[dateStr].regular += hours;
  });

  overtimes.forEach(ot => {
    const dateStr = ot.date.toISOString().split('T')[0];
    const hours = Number(ot.hours);
    
    if (!dailyLogs[dateStr]) dailyLogs[dateStr] = { date: dateStr, regular: 0, overtime: 0, clockIn: null, clockOut: null, notes: ot.description || '' };
    dailyLogs[dateStr].overtime += hours;
  });

  timeLogs.forEach(tl => {
    const dateStr = tl.date.toISOString().split('T')[0];
    if (!dailyLogs[dateStr]) dailyLogs[dateStr] = { date: dateStr, regular: 0, overtime: 0, clockIn: null, clockOut: null, notes: '' };
    dailyLogs[dateStr].clockIn = tl.clockIn;
    dailyLogs[dateStr].clockOut = tl.clockOut;
  });

  const logs = Object.values(dailyLogs).sort((a, b) => a.date.localeCompare(b.date));
  
  const totalRegularHours = logs.reduce((sum, l) => sum + l.regular, 0);
  const totalOvertimeHours = logs.reduce((sum, l) => sum + l.overtime, 0);
  
  const regularPay = totalRegularHours * hourlyRate;
  const overtimePay = totalOvertimeHours * hourlyRate * otMultiplier;
  const grossPay = regularPay + overtimePay;

  return c.json({
    employee,
    logs,
    summary: {
      totalRegularHours,
      totalOvertimeHours,
      hourlyRate,
      otMultiplier,
      regularPay,
      overtimePay,
      grossPay,
      currency
    }
  });
});

// Generate PDF Timesheet
timesheetsRouter.post('/generate', requirePermission('reports.export'), async (c: any) => {
  try {
    const data = await c.req.json();
    const { employee: requestedEmployee, logs, summary } = data;

    if (!requestedEmployee || !logs || !summary) {
      return c.json({ error: 'Incomplete timesheet data' }, 400);
    }

    // Role-based filtering: Employees only see themselves
    if (c.user.role === 'EMPLOYEE') {
      const actualEmployee = await getEmployeeByUserId(c.user.userId);
      if (!actualEmployee || actualEmployee.id !== requestedEmployee.id) {
        return c.json({ error: 'Unauthorized: You can only generate your own timesheet' }, 403);
      }
    }

    const employee = requestedEmployee;

    // Fetch Company Settings for Header
    const companyNameSetting = await (prisma as any).appSettings.findUnique({ where: { key: 'company.name' } });
    const companyName = companyNameSetting?.value || 'MY COMPANY';

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 50;

    // Header
    page.drawText(companyName.toUpperCase(), { x: 50, y, size: 20, font: fontBold, color: rgb(0, 0.2, 0.6) });
    y -= 25;
    page.drawText('CONTRACTOR TIMESHEET', { x: width - 200, y: height - 50, size: 16, font: fontBold });
    y -= 10;
    page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 30;

    // Employee/Contractor Info
    page.drawText('CONTRACTOR DETAILS', { x: 50, y, size: 10, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
    y -= 15;
    page.drawText(`Name: ${employee.user.fullName}`, { x: 50, y, size: 11, font });
    page.drawText(`ID: ${employee.employeeCode}`, { x: width - 150, y, size: 11, font });
    y -= 15;
    page.drawText(`Email: ${employee.user.email}`, { x: 50, y, size: 11, font });
    y -= 15;
    page.drawText(`Position: ${employee.position || 'Contractor'}`, { x: 50, y, size: 11, font });
    y -= 40;

    // Table Header
    const tableTop = y;
    page.drawRectangle({ x: 50, y: y - 5, width: width - 100, height: 20, color: rgb(0.95, 0.95, 0.95) });
    page.drawText('Date', { x: 60, y, size: 10, font: fontBold });
    page.drawText('Regular (hrs)', { x: 160, y, size: 10, font: fontBold });
    page.drawText('Overtime (hrs)', { x: 260, y, size: 10, font: fontBold });
    page.drawText('Total (hrs)', { x: 360, y, size: 10, font: fontBold });
    y -= 25;

    // Table Data
    logs.forEach((log: any) => {
      if (y < 100) { /* skip pagination for now */ }
      page.drawText(log.date, { x: 60, y, size: 10, font });
      page.drawText(log.regular.toFixed(2), { x: 160, y, size: 10, font });
      page.drawText(log.overtime.toFixed(2), { x: 260, y, size: 10, font });
      page.drawText((log.regular + log.overtime).toFixed(2), { x: 360, y, size: 10, font });
      y -= 18;
    });

    y -= 30;
    page.drawLine({ start: { x: width - 250, y: y + 10 }, end: { x: width - 50, y: y + 10 }, thickness: 1 });

    // Summary section
    const summaryX = width - 240;
    page.drawText('SUMMARY', { x: summaryX, y, size: 10, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
    y -= 20;
    page.drawText(`Total Regular Hours:`, { x: summaryX, y, size: 10, font });
    page.drawText(`${summary.totalRegularHours.toFixed(2)}`, { x: width - 100, y, size: 10, font });
    y -= 15;
    page.drawText(`Total Overtime Hours:`, { x: summaryX, y, size: 10, font });
    page.drawText(`${summary.totalOvertimeHours.toFixed(2)}`, { x: width - 100, y, size: 10, font });
    y -= 20;
    page.drawText(`Hourly Rate:`, { x: summaryX, y, size: 10, font });
    page.drawText(`${formatCurrency(summary.hourlyRate, summary.currency)}`, { x: width - 100, y, size: 10, font });
    y -= 15;
    page.drawText(`OT Multiplier:`, { x: summaryX, y, size: 10, font });
    page.drawText(`x${summary.otMultiplier}`, { x: width - 100, y, size: 10, font });
    y -= 25;

    page.drawRectangle({ x: summaryX - 10, y: y - 5, width: 200, height: 25, color: rgb(0, 0.2, 0.6) });
    page.drawText('GROSS TOTAL', { x: summaryX, y, size: 12, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText(`${formatCurrency(summary.grossPay, summary.currency)}`, { x: width - 100, y, size: 12, font: fontBold, color: rgb(1, 1, 1) });

    y -= 60;
    page.drawText('Company Signature: _______________________', { x: 50, y, size: 10, font });
    page.drawText('Date: ____________', { x: width - 180, y, size: 10, font });

    const pdfBytes = await pdfDoc.save();
    
    return c.body(pdfBytes, 200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Timesheet_${employee.employeeCode}_${logs[0].date}.pdf"`
    });
  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    return c.json({ error: 'Failed to generate PDF', details: error.message }, 500);
  }
});

export default timesheetsRouter;
