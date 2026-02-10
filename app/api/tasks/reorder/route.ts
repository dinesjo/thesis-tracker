import { NextRequest, NextResponse } from "next/server";
import { reorderTask } from "@/lib/domain/service";
import { reorderTaskSchema } from "@/lib/validators/schemas";
import { getUserOrNull } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/domain/http";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserOrNull();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const input = reorderTaskSchema.parse(payload);

    await reorderTask(user.id, input);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
