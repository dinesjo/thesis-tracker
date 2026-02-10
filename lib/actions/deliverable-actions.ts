"use server";

import { revalidatePath } from "next/cache";
import { createDeliverable, updateDeliverable } from "@/lib/domain/service";
import {
  createDeliverableSchema,
  updateDeliverableSchema,
} from "@/lib/validators/schemas";
import { getUserOrNull } from "@/lib/auth/session";

export async function createDeliverableAction(payload: unknown) {
  const user = await getUserOrNull();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const input = createDeliverableSchema.parse(payload);
  const created = await createDeliverable(user.id, input);

  revalidatePath("/app/deliverables");
  revalidatePath("/app/board");

  return created;
}

export async function updateDeliverableAction(deliverableId: string, payload: unknown) {
  const user = await getUserOrNull();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const input = updateDeliverableSchema.parse(payload);
  const updated = await updateDeliverable(user.id, deliverableId, input);

  revalidatePath("/app/deliverables");
  revalidatePath("/app/board");

  return updated;
}
