import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength, IsUrl, IsObject, IsEnum } from 'class-validator';
import { OrganizationStatus } from '@prisma/client';

export class UpdateOrganizationDto {
  @ApiProperty({ example: 'ACME Corporation', required: false })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 'acme.com', required: false })
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiProperty({ example: 'https://acme.com/logo.png', required: false })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({ enum: OrganizationStatus, required: false })
  @IsEnum(OrganizationStatus)
  @IsOptional()
  status?: OrganizationStatus;

  @ApiProperty({
    example: {
      branding: { primaryColor: '#007bff' },
      features: { enableAI: true },
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}

export class UpdateOrganizationSettingsDto {
  @ApiProperty({
    example: {
      branding: {
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
        fontFamily: 'Inter',
      },
      features: {
        enableAI: true,
        enableOffline: true,
        enableQRCodes: true,
        enableTeams: true,
      },
      limits: {
        maxUsers: 1000,
        maxCourses: 100,
        maxStorageGB: 50,
      },
      notifications: {
        emailEnabled: true,
        pushEnabled: true,
        digestFrequency: 'weekly',
      },
    },
  })
  @IsObject()
  @IsNotEmpty()
  settings: Record<string, any>;
}
