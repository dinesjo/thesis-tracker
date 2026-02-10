"use server";

import { revalidatePath } from "next/cache";
import { bootstrapWorkspace } from "@/lib/domain/service";
import { getUserOrNull } from "@/lib/auth/session";

export async function bootstrapAction() {
  const user = await getUserOrNull();
  if (!user) {
    throw new Error("Unauthorized");
  }

  await bootstrapWorkspace(user.id, user.username);
  revalidatePath("/app");
}
