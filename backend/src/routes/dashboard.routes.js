const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

// ==================== GET /api/dashboard ====================
// Returns aggregated dashboard data for the current user
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    // Task counts by status
    const taskWhere = isAdmin ? {} : {
      OR: [
        { assignedToId: userId },
        { project: { ownerId: userId } },
      ],
    };

    const [totalTasks, todoTasks, inProgressTasks, doneTasks, overdueTasks] =
      await Promise.all([
        prisma.task.count({ where: taskWhere }),
        prisma.task.count({ where: { ...taskWhere, status: 'TODO' } }),
        prisma.task.count({ where: { ...taskWhere, status: 'IN_PROGRESS' } }),
        prisma.task.count({ where: { ...taskWhere, status: 'DONE' } }),
        prisma.task.count({
          where: {
            ...taskWhere,
            status: { not: 'DONE' },
            dueDate: { lt: new Date() },
          },
        }),
      ]);

    // Total projects
    const projectWhere = isAdmin ? {} : {
      OR: [
        { ownerId: userId },
        { tasks: { some: { assignedToId: userId } } },
      ],
    };
    const totalProjects = await prisma.project.count({ where: projectWhere });

    // Total team members (admin only stat, but we'll return it for all)
    const totalMembers = await prisma.user.count();

    // Recent tasks (last 5)
    const recentTasks = await prisma.task.findMany({
      where: taskWhere,
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Overdue tasks list
    const overdueTasksList = await prisma.task.findMany({
      where: {
        ...taskWhere,
        status: { not: 'DONE' },
        dueDate: { lt: new Date() },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    res.json({
      stats: {
        totalTasks,
        todoTasks,
        inProgressTasks,
        doneTasks,
        overdueTasks,
        totalProjects,
        totalMembers,
      },
      recentTasks,
      overdueTasksList,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
