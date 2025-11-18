import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: any, organizationId: string) {
    this.logger.log(`Creating skill: ${data.name}`);

    const skill = await this.prisma.skill.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        parentSkillId: data.parentSkillId,
        organizationId,
      },
      include: {
        parentSkill: { select: { id: true, name: true } },
        _count: { select: { childSkills: true } },
      },
    });

    return skill;
  }

  async findAll(organizationId: string, params?: any) {
    const { category, parentSkillId, search } = params || {};

    const where: any = { organizationId };

    if (category) where.category = category;
    if (parentSkillId !== undefined) where.parentSkillId = parentSkillId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skills = await this.prisma.skill.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        parentSkill: { select: { id: true, name: true } },
        _count: {
          select: {
            childSkills: true,
            userCompetencies: true,
            courseSkills: true,
          },
        },
      },
    });

    return skills;
  }

  async findOne(id: string, organizationId: string) {
    const skill = await this.prisma.skill.findFirst({
      where: { id, organizationId },
      include: {
        parentSkill: { select: { id: true, name: true } },
        childSkills: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
          },
        },
        _count: {
          select: {
            userCompetencies: true,
            courseSkills: true,
            lessonSkills: true,
          },
        },
      },
    });

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    return skill;
  }

  async getHierarchy(organizationId: string) {
    // Get all root skills (no parent)
    const rootSkills = await this.prisma.skill.findMany({
      where: {
        organizationId,
        parentSkillId: null,
      },
      include: {
        childSkills: {
          include: {
            childSkills: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return rootSkills;
  }

  async update(id: string, organizationId: string, data: any) {
    await this.findOne(id, organizationId);

    const skill = await this.prisma.skill.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.parentSkillId !== undefined && { parentSkillId: data.parentSkillId }),
      },
    });

    return skill;
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    // Check if skill has child skills
    const childCount = await this.prisma.skill.count({
      where: { parentSkillId: id },
    });

    if (childCount > 0) {
      throw new BadRequestException(
        `Cannot delete skill with ${childCount} child skills. Delete child skills first.`,
      );
    }

    await this.prisma.skill.delete({ where: { id } });

    return { message: 'Skill deleted successfully' };
  }
}
