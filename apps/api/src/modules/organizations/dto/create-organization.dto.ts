import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsUrl, IsObject, Matches } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'ACME Corporation' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'acme-corp', description: 'URL-friendly slug (lowercase, hyphens only)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase letters, numbers, and hyphens only',
  })
  slug: string;

  @ApiProperty({ example: 'acme.com', required: false })
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiProperty({ example: 'https://acme.com/logo.png', required: false })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({
    example: {
      branding: { primaryColor: '#007bff', secondaryColor: '#6c757d' },
      features: { enableAI: true, enableOffline: true },
      limits: { maxUsers: 1000, maxCourses: 100 },
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}
