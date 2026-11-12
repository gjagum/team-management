import { Hono } from 'hono';
import { documentStorage } from '../storage.ts';
import { authMiddleware, requirePermission, auditLog } from '../middleware/auth.ts';
import { prisma } from '../db.ts';

const documentsRouter = new Hono();

documentsRouter.use('/*', authMiddleware);

documentsRouter.get('/employees/:employeeId/documents', requirePermission('documents.read'), async (c) => {
  const employeeId = parseInt(c.req.param('employeeId'));
  const documents = await prisma.employeeDocument.findMany({
    where: { employeeId },
    orderBy: { createdAt: 'desc' },
  });
  return c.json(documents);
});

documentsRouter.get('/employees/:employeeId/documents/:docId/download', requirePermission('documents.read'), async (c) => {
  const docId = parseInt(c.req.param('docId'));
  const doc = await prisma.employeeDocument.findUnique({ where: { id: docId } });
  if (!doc) return c.json({ error: 'Document not found' }, 404);

  const file = await documentStorage().get(doc.filePath);
  if (!file) return c.json({ error: 'File not found in storage' }, 404);

  return new Response(file, {
    status: 200,
    headers: {
      'Content-Type': doc.mimeType,
      'Content-Disposition': `attachment; filename="${doc.fileName}"`,
      'Content-Length': String(doc.fileSize),
    },
  });
});

documentsRouter.post('/employees/:employeeId/documents', requirePermission('documents.upload'), async (c) => {
  const employeeId = parseInt(c.req.param('employeeId'));

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return c.json({ error: 'Employee not found' }, 404);

  const formData = await c.req.parseBody();
  const file = formData['file'] as File;
  const type = (formData['type'] as string) || 'OTHER';
  const notes = (formData['notes'] as string) || null;
  const expiresAt = formData['expiresAt'] ? new Date(formData['expiresAt'] as string) : null;

  if (!file) return c.json({ error: 'No file provided' }, 400);

  // Strip path separators and other odd characters so the name can't escape the folder
  const safeFileName = `${Date.now()}_${file.name.replace(/[^\w.\-]+/g, '_')}`;
  const filePath = `uploads/documents/${employeeId}/${safeFileName}`;

  await documentStorage().put(filePath, await file.arrayBuffer(), file.type || 'application/octet-stream');

  const document = await prisma.employeeDocument.create({
    data: {
      employeeId,
      type: type as any,
      fileName: file.name,
      filePath,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      notes,
      expiresAt,
    },
  });

  await auditLog(c.user!.userId, 'CREATE', 'employee_document', document.id, null, {
    id: document.id,
    employeeId,
    fileName: document.fileName,
    type: document.type,
  });

  return c.json(document, 201);
});

documentsRouter.delete('/employees/:employeeId/documents/:docId', requirePermission('documents.delete'), async (c) => {
  const docId = parseInt(c.req.param('docId'));
  const doc = await prisma.employeeDocument.findUnique({ where: { id: docId } });
  if (!doc) return c.json({ error: 'Document not found' }, 404);

  try { await documentStorage().delete(doc.filePath); } catch { /* file may already be gone */ }
  await prisma.employeeDocument.delete({ where: { id: docId } });

  await auditLog(c.user!.userId, 'DELETE', 'employee_document', docId, doc, null);

  return c.json({ message: 'Document deleted' });
});

export default documentsRouter;
