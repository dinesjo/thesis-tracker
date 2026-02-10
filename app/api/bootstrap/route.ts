import { NextResponse } from "next/server";
import { bootstrapWorkspace } from "@/lib/domain/service";
import { getUserOrNull } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/domain/http";

export async function POST() {
  try {
    const user = await getUserOrNull();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await bootstrapWorkspace(user.id, user.username);
    return NextResponse.json({ project }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
