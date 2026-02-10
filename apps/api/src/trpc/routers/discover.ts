import { z } from 'zod';
import { router, protectedProcedure, connectedProcedure } from '../trpc';

export const discoverRouter = router({
  /**
   * Search creators from the local database.
   */
  searchCreators: protectedProcedure
    .input(
      z.object({
        keyword: z.string().min(1).max(100),
        minEngagementRate: z.number().min(0).optional(),
        minPostCount: z.number().int().min(0).optional(),
        verifiedOnly: z.boolean().default(false),
        sortBy: z
          .enum([
            'avgEngagement',
            'avgLikes',
            'observedPostCount',
            'postFrequency',
          ])
          .default('avgEngagement'),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        username: { contains: input.keyword, mode: 'insensitive' },
      };

      if (input.verifiedOnly) {
        where.isVerified = true;
      }
      if (input.minEngagementRate !== undefined) {
        where.avgEngagement = { gte: input.minEngagementRate };
      }
      if (input.minPostCount !== undefined) {
        where.observedPostCount = { gte: input.minPostCount };
      }

      const creators = await ctx.prisma.creator.findMany({
        where,
        orderBy: { [input.sortBy]: 'desc' },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });

      let nextCursor: string | undefined;
      if (creators.length > input.limit) {
        const next = creators.pop()!;
        nextCursor = next.id;
      }

      return {
        creators: creators.map((c) => ({
          id: c.id,
          threadsUserId: c.threadsUserId,
          username: c.username,
          profilePictureUrl: c.profilePictureUrl ?? '',
          biography: c.biography ?? '',
          isVerified: c.isVerified,
          observedPostCount: c.observedPostCount,
          avgLikes: c.avgLikes ?? 0,
          avgReplies: c.avgReplies ?? 0,
          avgReposts: c.avgReposts ?? 0,
          avgEngagement: c.avgEngagement ?? 0,
          primaryTopics: c.primaryTopics,
          lastPostAt: c.lastPostAt?.toISOString() ?? '',
        })),
        nextCursor,
      };
    }),

  /**
   * Search public posts via the Threads API.
   */
  searchPosts: connectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        mediaType: z
          .enum(['TEXT', 'IMAGE', 'VIDEO', 'CAROUSEL'])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const result = await ctx.threadsClient.keywordSearch({
        q: input.query,
        media_type: input.mediaType,
      });

      return {
        posts: result.data.map((p) => ({
          id: p.id,
          text: p.text ?? '',
          mediaType: (p.media_type ?? 'TEXT') as string,
          permalink: p.permalink ?? '',
          username: p.username ?? '',
          publishedAt: p.timestamp ?? '',
          topicTag: p.topic_tag,
          likes: p.likes ?? 0,
          replies: p.replies ?? 0,
          reposts: p.reposts ?? 0,
        })),
      };
    }),

  /**
   * Track a creator by upserting into TrackedCreator.
   */
  trackCreator: protectedProcedure
    .input(
      z.object({
        creatorId: z.string(),
        notes: z.string().max(500).optional(),
        tags: z.array(z.string().max(50)).max(10).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tracked = await ctx.prisma.trackedCreator.upsert({
        where: {
          userId_creatorId: {
            userId: ctx.userId,
            creatorId: input.creatorId,
          },
        },
        create: {
          userId: ctx.userId,
          creatorId: input.creatorId,
          notes: input.notes,
          tags: input.tags ?? [],
        },
        update: {
          notes: input.notes,
          tags: input.tags ?? [],
        },
      });

      return { id: tracked.id };
    }),
});
