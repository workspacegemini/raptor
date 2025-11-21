import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamMemberRole } from '../../common/types/prisma-types';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: any, organizationId: string) {
    this.logger.log(`Creating team: ${data.name}`);

    // If parent team specified, verify it exists
    if (data.parentTeamId) {
      const parentTeam = await this.prisma.team.findFirst({
        where: {
          id: data.parentTeamId,
          organizationId,
          deletedAt: null,
        },
      });

      if (!parentTeam) {
        throw new NotFoundException('Parent team not found');
      }
    }

    const team = await this.prisma.team.create({
      data: {
        name: data.name,
        description: data.description,
        organizationId,
        parentTeamId: data.parentTeamId,
      },
      include: {
        parentTeam: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            members: true,
            childTeams: true,
          },
        },
      },
    });

    this.logger.log(`Created team: ${team.id}`);
    return team;
  }

  async findAll(organizationId: string, params?: any) {
    const { parentTeamId, search } = params || {};

    const where: any = {
      organizationId,
      deletedAt: null,
    };

    if (parentTeamId !== undefined) {
      where.parentTeamId = parentTeamId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const teams = await this.prisma.team.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        parentTeam: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            members: true,
            childTeams: true,
            enrollments: true,
          },
        },
      },
    });

    return teams;
  }

  async findOne(id: string, organizationId: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      include: {
        parentTeam: {
          select: {
            id: true,
            name: true,
          },
        },
        childTeams: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            description: true,
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }

  async getHierarchy(organizationId: string) {
    // Get all root teams (no parent)
    const rootTeams = await this.prisma.team.findMany({
      where: {
        organizationId,
        parentTeamId: null,
        deletedAt: null,
      },
      include: {
        childTeams: {
          where: { deletedAt: null },
          include: {
            childTeams: {
              where: { deletedAt: null },
              include: {
                _count: {
                  select: { members: true },
                },
              },
            },
            _count: {
              select: { members: true },
            },
          },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return rootTeams;
  }

  async update(id: string, organizationId: string, data: any) {
    const team = await this.prisma.team.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // If changing parent, verify new parent exists and prevent circular reference
    if (data.parentTeamId !== undefined) {
      if (data.parentTeamId) {
        const newParent = await this.prisma.team.findFirst({
          where: {
            id: data.parentTeamId,
            organizationId,
            deletedAt: null,
          },
        });

        if (!newParent) {
          throw new NotFoundException('Parent team not found');
        }

        // Check for circular reference
        if (await this.wouldCreateCircularReference(id, data.parentTeamId)) {
          throw new BadRequestException('Cannot create circular team hierarchy');
        }
      }
    }

    const updated = await this.prisma.team.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.parentTeamId !== undefined && { parentTeamId: data.parentTeamId }),
      },
    });

    this.logger.log(`Updated team: ${id}`);
    return updated;
  }

  async remove(id: string, organizationId: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Check if has child teams
    const childCount = await this.prisma.team.count({
      where: {
        parentTeamId: id,
        deletedAt: null,
      },
    });

    if (childCount > 0) {
      throw new BadRequestException(
        `Cannot delete team with ${childCount} child teams. Delete child teams first.`,
      );
    }

    await this.prisma.team.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Soft deleted team: ${id}`);
    return { message: 'Team deleted successfully' };
  }

  // Member management
  async addMember(teamId: string, userId: string, organizationId: string, role: TeamMemberRole = TeamMemberRole.MEMBER) {
    this.logger.log(`Adding user ${userId} to team ${teamId}`);

    // Verify team exists
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Verify user exists and belongs to organization
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already a member
    const existing = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('User is already a member of this team');
    }

    const member = await this.prisma.teamMember.create({
      data: {
        teamId,
        userId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    this.logger.log(`Added user ${userId} to team ${teamId}`);
    return member;
  }

  async removeMember(teamId: string, userId: string, organizationId: string) {
    this.logger.log(`Removing user ${userId} from team ${teamId}`);

    // Verify team exists
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const member = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('User is not a member of this team');
    }

    await this.prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });

    this.logger.log(`Removed user ${userId} from team ${teamId}`);
    return { message: 'Member removed successfully' };
  }

  async updateMemberRole(teamId: string, userId: string, organizationId: string, role: TeamMemberRole) {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const member = await this.prisma.teamMember.update({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
      data: { role },
    });

    this.logger.log(`Updated role for user ${userId} in team ${teamId}`);
    return member;
  }

  async getStatistics(teamId: string, organizationId: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const [
      totalMembers,
      leadCount,
      enrollments,
      completedEnrollments,
    ] = await Promise.all([
      this.prisma.teamMember.count({
        where: { teamId },
      }),
      this.prisma.teamMember.count({
        where: {
          teamId,
          role: TeamMemberRole.LEAD,
        },
      }),
      this.prisma.enrollment.count({
        where: { teamId },
      }),
      this.prisma.enrollment.count({
        where: {
          teamId,
          status: 'COMPLETED',
        },
      }),
    ]);

    const completionRate = enrollments > 0 ? (completedEnrollments / enrollments) * 100 : 0;

    return {
      members: {
        total: totalMembers,
        leads: leadCount,
        members: totalMembers - leadCount,
      },
      enrollments: {
        total: enrollments,
        completed: completedEnrollments,
        inProgress: enrollments - completedEnrollments,
        completionRate: Math.round(completionRate * 100) / 100,
      },
    };
  }

  private async wouldCreateCircularReference(teamId: string, newParentId: string): Promise<boolean> {
    if (teamId === newParentId) {
      return true;
    }

    let currentId = newParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) {
        return true; // Circular reference detected
      }

      if (currentId === teamId) {
        return true;
      }

      visited.add(currentId);

      const parent = await this.prisma.team.findUnique({
        where: { id: currentId },
        select: { parentTeamId: true },
      });

      if (!parent || !parent.parentTeamId) {
        break;
      }

      currentId = parent.parentTeamId;
    }

    return false;
  }
}
