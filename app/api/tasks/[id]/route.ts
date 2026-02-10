import { NextRequest, NextResponse } from "next/server";
import { deleteTask, updateTask } from "@/lib/domain/service";
import { updateTaskSchema } from "@/lib/validators/schemas";
import { getUserOrNull } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/domain/http";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserOrNull();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const payload = await request.json();
    const input = updateTaskSchema.parse(payload);

    const task = await updateTask(user.id, id, input);
    return NextResponse.json({ task }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserOrNull();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    await deleteTask(user.id, id);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
