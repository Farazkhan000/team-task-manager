const express = require('express');
const { body } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

router.use(authenticate);

// ==================== GET /api/tasks ====================
// ADMIN: all tasks, MEMBER: assigned tasks
router.get('/', async (req, res, next) => {
  try {
    const { projectId, status, assignedToId } = req.query;
    const where = {};

    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (assignedToId) where.assignedToId = assignedToId;

    // Members only see tasks assigned to them or in projects they own
    if (req.user.role !== 'ADMIN') {
      where.OR = [
        { assignedToId: req.user.id },
        { project: { ownerId: req.user.id } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// ==================== GET /api/tasks/:id ====================
router.get('/:id', async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// ==================== POST /api/tasks ====================
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Task title is required.'),
    body('projectId').notEmpty().withMessage('Project ID is required.'),
    body('dueDate').isISO8601().withMessage('Valid due date is required (ISO 8601).'),
    body('status')
      .optional()
      .isIn(['TODO', 'IN_PROGRESS', 'DONE'])
      .withMessage('Status must be TODO, IN_PROGRESS, or DONE.'),
    body('assignedToId').optional().isString(),
    body('description').optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { title, description, status, dueDate, projectId, assignedToId } = req.body;

      // Verify project exists
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) {
        return res.status(404).json({ error: 'Project not found.' });
      }

      // Only project owner or ADMIN can create tasks
      if (project.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden. Only the project owner or an admin can create tasks.' });
      }

      // Verify assignee exists if provided
      if (assignedToId) {
        const assignee = await prisma.user.findUnique({ where: { id: assignedToId } });
        if (!assignee) {
          return res.status(404).json({ error: 'Assigned user not found.' });
        }
      }

      const task = await prisma.task.create({
        data: {
          title,
          description: description || '',
          status: status || 'TODO',
          dueDate: new Date(dueDate),
          projectId,
          assignedToId: assignedToId || null,
        },
        include: {
          project: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      });
      res.status(201).json(task);
    } catch (err) {
      next(err);
    }
  }
);

// ==================== PUT /api/tasks/:id ====================
router.put(
  '/:id',
  [
    body('title').optional().trim().notEmpty().withMessage('Task title cannot be empty.'),
    body('status')
      .optional()
      .isIn(['TODO', 'IN_PROGRESS', 'DONE'])
      .withMessage('Status must be TODO, IN_PROGRESS, or DONE.'),
    body('dueDate').optional().isISO8601().withMessage('Valid due date is required.'),
    body('assignedToId').optional({ nullable: true }),
    body('description').optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const task = await prisma.task.findUnique({
        where: { id: req.params.id },
        include: { project: true },
      });
      if (!task) {
        return res.status(404).json({ error: 'Task not found.' });
      }

      // Owner, assignee, or ADMIN can update
      const isOwner = task.project.ownerId === req.user.id;
      const isAssignee = task.assignedToId === req.user.id;
      const isAdmin = req.user.role === 'ADMIN';
      if (!isOwner && !isAssignee && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden.' });
      }

      const data = {};
      if (req.body.title !== undefined) data.title = req.body.title;
      if (req.body.description !== undefined) data.description = req.body.description;
      if (req.body.status !== undefined) data.status = req.body.status;
      if (req.body.dueDate !== undefined) data.dueDate = new Date(req.body.dueDate);
      if (req.body.assignedToId !== undefined) data.assignedToId = req.body.assignedToId || null;

      const updated = await prisma.task.update({
        where: { id: req.params.id },
        data,
        include: {
          project: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// ==================== DELETE /api/tasks/:id ====================
router.delete('/:id', async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { project: true },
    });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const isOwner = task.project.ownerId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden. Only the project owner or an admin can delete tasks.' });
    }

    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
