import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TeamMemberRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'New role for the team member',
    enum: TeamMemberRole,
  })
  @IsEnum(TeamMemberRole)
  @IsNotEmpty()
  role: TeamMemberRole;
}
