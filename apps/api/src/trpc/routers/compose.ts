import { z } from 'zod';
import { router, protectedProcedure, connectedProcedure } from '../trpc';
import { composePostSchema, PLAN_LIMITS, type PlanTier } from '@threadscope/shared';
import { TRPCError } from '@trpc/server';
import { scheduledPostQueue } from '../../lib/queue';

export const composeRouter = router({
  /**
   * Publish a post immediately to Threads.
   */
  publish: connectedProcedure
    .input(composePostSchema)
    .mutation(async ({ ctx, input }) => {
      const threadsUserId = ctx.connection.threadsUserId;

      const result = await ctx.threadsClient.publishPost({
        user_id: threadsUserId,
        media_type: input.mediaType as 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL',
        text: input.text,
        image_url: input.mediaUrls?.[0],
        video_url:
          input.mediaType === 'VIDEO' ? input.mediaUrls?.[0] : undefined,
        reply_to_id: input.replyToId,
        reply_control: input.replyControl,
        topic_tag: input.topicTag,
        link_attachment_url: input.linkUrl,
        poll: input.pollOptions
          ? {
              options: input.pollOptions,
              duration: input.pollDuration ?? 86400,
            }
          : undefined,
      });

      return {
        mediaId: result.id,
        permalink: `https://www.threads.net/@${ctx.connection.username}/post/${result.id}`,
      };
    }),

  /**
   * Schedule a post for later publication.
   */
  schedule: connectedProcedure
    .input(
      composePostSchema.extend({
        scheduledFor: z
          .string()
          .datetime()
          .refine(
            (d) => new Date(d).getTime() > Date.now() + 60_000,
            'Scheduled time must be at least 1 minute in the future',
          ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Enforce plan limits on scheduled posts
      const user = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.userId },
        select: { plan: true },
      });
      const limits = PLAN_LIMITS[user.plan as PlanTier];
      if (!limits) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Unknown plan tier' });
      }
      const pendingCount = await ctx.prisma.scheduledPost.count({
        where: { userId: ctx.userId, status: 'PENDING' },
      });
      if (pendingCount >= limits.maxScheduledPosts) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Your ${user.plan} plan allows a maximum of ${limits.maxScheduledPosts} scheduled posts. Please upgrade or cancel existing posts.`,
        });
      }

      const scheduledPost = await ctx.prisma.scheduledPost.create({
        data: {
          userId: ctx.userId,
          text: input.text,
          mediaType: input.mediaType,
          mediaUrls: input.mediaUrls ?? [],
          replyToId: input.replyToId,
          replyControl: input.replyControl,
          topicTag: input.topicTag,
          pollOptions: input.pollOptions ?? [],
          pollDuration: input.pollDuration,
          linkUrl: input.linkUrl,
          scheduledFor: new Date(input.scheduledFor),
        },
      });

      // Enqueue a delayed job
      const delay = new Date(input.scheduledFor).getTime() - Date.now();
      await scheduledPostQueue.add(
        'scheduled-post-publish',
        { scheduledPostId: scheduledPost.id, userId: ctx.userId },
        { delay },
      );

      return {
        id: scheduledPost.id,
        scheduledFor: scheduledPost.scheduledFor.toISOString(),
      };
    }),

  /**
   * List pending scheduled posts.
   */
  scheduledPosts: protectedProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.scheduledPost.findMany({
      where: {
        userId: ctx.userId,
        status: { in: ['PENDING', 'PUBLISHING'] },
      },
      orderBy: { scheduledFor: 'asc' },
    });

    return posts.map((p) => ({
      id: p.id,
      text: p.text,
      mediaType: p.mediaType,
      scheduledFor: p.scheduledFor.toISOString(),
      status: p.status.toLowerCase() as string,
      createdAt: p.createdAt.toISOString(),
    }));
  }),

  /**
   * Cancel a scheduled post.
   */
  cancelScheduled: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.prisma.scheduledPost.findFirst({
        where: { id: input.id, userId: ctx.userId, status: 'PENDING' },
      });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Scheduled post not found or cannot be cancelled',
        });
      }

      await ctx.prisma.scheduledPost.update({
        where: { id: input.id },
        data: { status: 'CANCELLED' },
      });

      return { success: true };
    }),
});
