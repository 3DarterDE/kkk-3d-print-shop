import { z } from 'zod';
import { Types } from 'mongoose';

export const objectId = z.string().refine(Types.ObjectId.isValid, 'Invalid ObjectId');

export const orderItem = z.object({
  productId: z.string().min(1),
  name: z.string().min(1).optional(),
  image: z.string().min(1).optional(),
  price: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  variations: z.record(z.string()).optional(),
});

export const addressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().optional().nullable(),
  street: z.string().min(1),
  houseNumber: z.string().min(1),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(1),
  postalCode: z.string().min(2),
  country: z.string().min(2),
});

export const orderBody = z.object({
  items: z.array(orderItem).min(1),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional().nullable(),
  paymentMethod: z.enum(['card', 'paypal', 'bank']).optional(),
  redeemPoints: z.boolean().optional(),
  pointsToRedeem: z.number().int().nonnegative().optional(),
  newsletterSubscribed: z.boolean().optional(),
  discountCode: z.string().trim().max(64).optional(),
});

export const profileUpdateBody = z.object({
  salutation: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  address: addressSchema.nullable().optional(),
  billingAddress: addressSchema.nullable().optional(),
  useSameAddress: z.boolean().optional(),
  paymentMethod: z.enum(['card', 'paypal', 'bank']).optional(),
});

export function assertObjectId(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new Error('Invalid ObjectId');
}


