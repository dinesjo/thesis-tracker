"use server";

import { revalidatePath } from "next/cache";
import { createTask, updateTask } from "@/lib/domain/service";
import { createTaskSchema, updateTaskSchema } from "@/lib/validators/schemas";
import { getUserOrNull } from "@/lib/auth/session";

export async function createTaskAction(payload: unknown) {
  const user = await getUserOrNull();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const input = createTaskSchema.parse(payload);
  const task = await createTask(user.id, input);

  revalidatePath("/app/board");
  revalidatePath("/app/timeline");
  revalidatePath("/app/deliverables");

  return task;
}

export async function updateTaskAction(taskId: string, payload: unknown) {
  const user = await getUserOrNull();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const input = updateTaskSchema.parse(payload);
  const task = await updateTask(user.id, taskId, input);

  revalidatePath("/app/board");
  revalidatePath("/app/timeline");
  revalidatePath("/app/deliverables");

  return task;
}
