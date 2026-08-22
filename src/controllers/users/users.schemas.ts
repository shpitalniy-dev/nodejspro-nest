import { z } from 'zod';

export const CreateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email(),
  age: z.number().int().min(18).max(100).optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const IdParamSchema = z.coerce.number().int().min(1);

export const LimitQuerySchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(100)
  .optional();
