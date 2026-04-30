const express = require('express');
const { body } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

// All project routes require authentication
router.use(authenticate);

// ==================== GET /api/projects ====================
// Returns all projects (ADMIN sees all, MEMBER sees own + assigned)
router.get('/', async (req, res, next) => {
  try {
    let projects;
    if (req.user.role === 'ADMIN') {
      projects = await prisma.project.findMany({
        include: {
          owner: { select: { id: true, name: true, email: true } },
          tasks: { include: { assignedTo: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      projects = await prisma.project.findMany({
        where: {
          OR: [
            { ownerId: req.user.id },
            { tasks: { some: { assignedToId: req.user.id } } },
          ],
        },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          tasks: { include: { assignedTo: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// ==================== GET /api/projects/:id ====================
router.get('/:id', async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        tasks: {
          include: { assignedTo: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    res.json(project);
  } catch (err) {
    next(err);
  }
});

// ==================== POST /api/projects ====================
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Project name is required.'),
    body('description').optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, description } = req.body;
      const project = await prisma.project.create({
        data: {
          name,
          description: description || '',
          ownerId: req.user.id,
        },
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      });
      res.status(201).json(project);
    } catch (err) {
      next(err);
    }
  }
);

// ==================== PUT /api/projects/:id ====================
router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty().withMessage('Project name cannot be empty.'),
    body('description').optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const project = await prisma.project.findUnique({ where: { id: req.params.id } });
      if (!project) {
        return res.status(404).json({ error: 'Project not found.' });
      }
      // Only owner or ADMIN can update
      if (project.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden. Only the owner or an admin can update this project.' });
      }

      const updated = await prisma.project.update({
        where: { id: req.params.id },
        data: {
          ...(req.body.name && { name: req.body.name }),
          ...(req.body.description !== undefined && { description: req.body.description }),
        },
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// ==================== DELETE /api/projects/:id ====================
router.delete('/:id', async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    // Only owner or ADMIN can delete
    if (project.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden. Only the owner or an admin can delete this project.' });
    }

    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
