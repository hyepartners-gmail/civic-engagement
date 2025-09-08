import { z } from 'zod';

// Example DTO for creating a group
export const CreateGroupRequestSchema = z.object({
  nickname: z.string().min(3).max(50).optional(),
  version: z.string().default('v1'),
});
export type CreateGroupRequest = z.infer<typeof CreateGroupRequestSchema>;

export const CreateGroupResponseSchema = z.object({
  id: z.string(),
  groupCode: z.string(),
});
export type CreateGroupResponse = z.infer<typeof CreateGroupResponseSchema>;

// Example DTO for submitting a response
export const SubmitResponseRequestSchema = z.object({
  questionId: z.string(),
  optionId: z.string(),
  version: z.string(),
});
export type SubmitResponseRequest = z.infer<typeof SubmitResponseRequestSchema>;