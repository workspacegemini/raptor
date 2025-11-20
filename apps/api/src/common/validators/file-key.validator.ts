import { BadRequestException } from '@nestjs/common';

/**
 * Validates file key to prevent path traversal attacks
 * @param key - The file key to validate
 * @throws BadRequestException if the key contains malicious patterns
 */
export function validateFileKey(key: string): void {
  if (!key || typeof key !== 'string') {
    throw new BadRequestException('Invalid file key');
  }

  // Check for path traversal patterns
  const dangerousPatterns = [
    /\.\.\//,     // ../
    /\.\.\\/,     // ..\
    /^\//, // Absolute path (starts with /)
    /^\\/,        // Absolute path (starts with \)
    /\0/,         // Null byte
    /%2e%2e/i,    // URL encoded ../
    /%2f/i,       // URL encoded /
    /%5c/i,       // URL encoded \
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(key)) {
      throw new BadRequestException(
        'Invalid file key: Path traversal patterns are not allowed',
      );
    }
  }

  // Ensure key doesn't start with '..' (covers edge cases)
  if (key.startsWith('..')) {
    throw new BadRequestException(
      'Invalid file key: Cannot start with ".."',
    );
  }

  // Validate key length (prevent DOS via very long keys)
  if (key.length > 500) {
    throw new BadRequestException(
      'Invalid file key: Key too long (max 500 characters)',
    );
  }

  // Validate allowed characters (alphanumeric, hyphens, underscores, forward slashes, dots, and spaces)
  const allowedPattern = /^[a-zA-Z0-9\-_\/. ]+$/;
  if (!allowedPattern.test(key)) {
    throw new BadRequestException(
      'Invalid file key: Contains invalid characters',
    );
  }
}

/**
 * Sanitizes file key by removing dangerous patterns
 * @param key - The file key to sanitize
 * @returns Sanitized file key
 */
export function sanitizeFileKey(key: string): string {
  if (!key || typeof key !== 'string') {
    throw new BadRequestException('Invalid file key');
  }

  // Remove any ../ or ..\ patterns
  let sanitized = key.replace(/\.\.\//g, '').replace(/\.\.\\/g, '');

  // Remove leading slashes
  sanitized = sanitized.replace(/^\/+/, '').replace(/^\\+/, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Normalize multiple slashes to single slash
  sanitized = sanitized.replace(/\/+/g, '/');

  return sanitized;
}
