import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TeamMemberRole } from '../../../common/types/prisma-types';

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'New role for the team member',
    enum: TeamMemberRole,
  })
  @IsEnum(TeamMemberRole)
  @IsNotEmpty()
  role: TeamMemberRole;
}
