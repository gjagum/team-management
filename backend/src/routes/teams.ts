import { Hono } from 'hono';
import { authMiddleware, requirePermission, requireRole, auditLog } from '../middleware/auth.ts';
import { prisma } from '../index.ts';

const teamsRouter = new Hono();

teamsRouter.use('/*', authMiddleware);

// Get all teams (authenticated users can read)
teamsRouter.get('/', async (c) => {
  const teams = await prisma.team.findMany({
    include: {
      teamLeader: {
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      },
      alternateApprover: {
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      },
      members: {
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return c.json(teams);
});

// Get a single team
teamsRouter.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      teamLeader: {
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      },
      alternateApprover: {
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      },
      members: {
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!team) return c.json({ error: 'Team not found' }, 404);
  return c.json(team);
});

// Create a team (admin only)
teamsRouter.post('/', requireRole('ADMIN'), async (c) => {
  const data = await c.req.json();

  if (!data.name) {
    return c.json({ error: 'Team name is required' }, 400);
  }

  // Validate team leader if provided
  if (data.teamLeaderId) {
    const leader = await prisma.employee.findUnique({ where: { id: data.teamLeaderId } });
    if (!leader) return c.json({ error: 'Team leader employee not found' }, 400);
  }

  // Validate alternate approver if provided
  if (data.alternateApproverId) {
    const alt = await prisma.employee.findUnique({ where: { id: data.alternateApproverId } });
    if (!alt) return c.json({ error: 'Alternate approver employee not found' }, 400);
  }

  // Ensure user gets TEAM_LEADER role if a team leader is assigned
  if (data.teamLeaderId) {
    const leaderEmployee = await prisma.employee.findUnique({
      where: { id: data.teamLeaderId },
      include: { user: true },
    });
    if (leaderEmployee) {
      await prisma.user.update({
        where: { id: leaderEmployee.userId },
        data: { role: 'TEAM_LEADER' },
      });
    }
  }

  const team = await prisma.team.create({
    data: {
      name: data.name,
      description: data.description || null,
      teamLeaderId: data.teamLeaderId || null,
      alternateApproverId: data.alternateApproverId || null,
    },
    include: {
      teamLeader: {
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      },
      alternateApprover: {
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      },
    },
  });

  await auditLog((c as any).user.userId, 'CREATE', 'team', team.id, null, team);

  return c.json(team, 201);
});

// Update a team (admin only)
teamsRouter.put('/:id', requireRole('ADMIN'), async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = await c.req.json();

  const oldTeam = await prisma.team.findUnique({ where: { id } });
  if (!oldTeam) return c.json({ error: 'Team not found' }, 404);

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.teamLeaderId !== undefined) updateData.teamLeaderId = data.teamLeaderId || null;
  if (data.alternateApproverId !== undefined) updateData.alternateApproverId = data.alternateApproverId || null;

  // Validate team leader if provided
  if (updateData.teamLeaderId) {
    const leader = await prisma.employee.findUnique({ where: { id: updateData.teamLeaderId } });
    if (!leader) return c.json({ error: 'Team leader employee not found' }, 400);

    // Ensure user gets TEAM_LEADER role
    const leaderEmployee = await prisma.employee.findUnique({
      where: { id: updateData.teamLeaderId },
      include: { user: true },
    });
    if (leaderEmployee) {
      await prisma.user.update({
        where: { id: leaderEmployee.userId },
        data: { role: 'TEAM_LEADER' },
      });
    }
  }

  // Validate alternate approver if provided
  if (updateData.alternateApproverId) {
    const alt = await prisma.employee.findUnique({ where: { id: updateData.alternateApproverId } });
    if (!alt) return c.json({ error: 'Alternate approver employee not found' }, 400);
  }

  // If team leader is being removed, reset their role to EMPLOYEE
  if (data.teamLeaderId === null && oldTeam.teamLeaderId) {
    const oldLeader = await prisma.employee.findUnique({
      where: { id: oldTeam.teamLeaderId },
      include: { user: true },
    });
    if (oldLeader && oldLeader.user.role === 'TEAM_LEADER') {
      // Only reset if they're not leading another team
      const otherTeams = await prisma.team.count({
        where: { teamLeaderId: oldTeam.teamLeaderId, id: { not: id } },
      });
      if (otherTeams === 0) {
        await prisma.user.update({
          where: { id: oldLeader.userId },
          data: { role: 'EMPLOYEE' },
        });
      }
    }
  }

  const team = await prisma.team.update({
    where: { id },
    data: updateData,
    include: {
      teamLeader: {
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      },
      alternateApprover: {
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      },
    },
  });

  await auditLog((c as any).user.userId, 'UPDATE', 'team', id, oldTeam, team);

  return c.json(team);
});

// Delete a team (admin only)
teamsRouter.delete('/:id', requireRole('ADMIN'), async (c) => {
  const id = parseInt(c.req.param('id'));

  const oldTeam = await prisma.team.findUnique({ where: { id } });
  if (!oldTeam) return c.json({ error: 'Team not found' }, 404);

  // Unassign all members from this team
  await prisma.employee.updateMany({
    where: { teamId: id },
    data: { teamId: null },
  });

  // Reset team leader role if applicable
  if (oldTeam.teamLeaderId) {
    const leader = await prisma.employee.findUnique({
      where: { id: oldTeam.teamLeaderId },
      include: { user: true },
    });
    if (leader && leader.user.role === 'TEAM_LEADER') {
      const otherTeams = await prisma.team.count({
        where: { teamLeaderId: oldTeam.teamLeaderId },
      });
      if (otherTeams === 0) {
        await prisma.user.update({
          where: { id: leader.userId },
          data: { role: 'EMPLOYEE' },
        });
      }
    }
  }

  await prisma.team.delete({ where: { id } });

  await auditLog((c as any).user.userId, 'DELETE', 'team', id, oldTeam, null);

  return c.json({ message: 'Team deleted successfully' });
});

// Assign members to a team (admin only)
teamsRouter.post('/:id/members', requireRole('ADMIN'), async (c) => {
  const teamId = parseInt(c.req.param('id'));
  const { employeeIds } = await c.req.json();

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return c.json({ error: 'Team not found' }, 404);

  if (!Array.isArray(employeeIds)) {
    return c.json({ error: 'employeeIds must be an array' }, 400);
  }

  // Remove existing members not in the new list
  await prisma.employee.updateMany({
    where: {
      teamId,
      id: { notIn: employeeIds },
    },
    data: { teamId: null },
  });

  // Assign new members
  await prisma.employee.updateMany({
    where: { id: { in: employeeIds } },
    data: { teamId },
  });

  const updatedTeam = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      teamLeader: {
        include: {
          user: { select: { id: true, fullName: true, email: true, role: true } },
        },
      },
      alternateApprover: {
        include: {
          user: { select: { id: true, fullName: true, email: true, role: true } },
        },
      },
      members: {
        include: {
          user: { select: { id: true, fullName: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  await auditLog((c as any).user.userId, 'UPDATE', 'team', teamId, null, { membersUpdated: employeeIds });

  return c.json(updatedTeam);
});

export default teamsRouter;
