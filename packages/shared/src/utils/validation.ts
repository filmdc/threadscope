// -------------------------------------------------------
// Zod validation schemas
// -------------------------------------------------------

import { z } from 'zod';

/**
 * Email address schema.
 */
export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Invalid email address')
  .max(254, 'Email must be at most 254 characters');

/**
 * Password schema.
 * Requires at least 8 characters, one uppercase, one lowercase, and one digit.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit');

/**
 * Tracked-keyword schema.
 */
export const keywordSchema = z
  .string()
  .trim()
  .min(2, 'Keyword must be at least 2 characters')
  .max(100, 'Keyword must be at most 100 characters')
  .regex(
    /^[a-zA-Z0-9\s#@_-]+$/,
    'Keyword may only contain letters, numbers, spaces, #, @, _ and -',
  );

/**
 * Post composition schema.
 */
export const composePostSchema = z.object({
  text: z
    .string()
    .min(1, 'Post text is required')
    .max(500, 'Post text must be at most 500 characters'),
  mediaType: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'CAROUSEL']),
  mediaUrls: z.array(z.string().url('Invalid media URL')).optional(),
  replyToId: z.string().optional(),
  replyControl: z
    .enum(['everyone', 'accounts_you_follow', 'mentioned_only'])
    .optional(),
  topicTag: z.string().max(50).optional(),
  pollOptions: z
    .array(z.string().min(1).max(25))
    .min(2, 'A poll must have at least 2 options')
    .max(4, 'A poll can have at most 4 options')
    .optional(),
  pollDuration: z
    .number()
    .int()
    .min(300, 'Poll duration must be at least 5 minutes (300s)')
    .max(86400, 'Poll duration must be at most 24 hours (86400s)')
    .optional(),
  linkUrl: z.string().url('Invalid link URL').optional(),
  locationId: z.string().optional(),
});

/**
 * Date range schema.
 * Validates that `start` is before `end` and both are valid ISO date strings.
 */
export const dateRangeSchema = z
  .object({
    start: z.string().datetime({ message: 'Start must be a valid ISO datetime' }),
    end: z.string().datetime({ message: 'End must be a valid ISO datetime' }),
  })
  .refine(
    (data) => new Date(data.start).getTime() < new Date(data.end).getTime(),
    { message: 'Start date must be before end date' },
  );

// -------------------------------------------------------
// Inferred types (re-export for convenience)
// -------------------------------------------------------

export type EmailInput = z.infer<typeof emailSchema>;
export type PasswordInput = z.infer<typeof passwordSchema>;
export type KeywordInput = z.infer<typeof keywordSchema>;
export type ComposePostSchemaInput = z.infer<typeof composePostSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
