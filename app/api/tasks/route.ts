import { NextRequest, NextResponse } from "next/server";
import { createTask } from "@/lib/domain/service";
import { createTaskSchema } from "@/lib/validators/schemas";
import { getUserOrNull } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/domain/http";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserOrNull();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const input = createTaskSchema.parse(payload);

    const task = await createTask(user.id, input);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
