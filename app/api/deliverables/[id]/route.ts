import { NextRequest, NextResponse } from "next/server";
import { deleteDeliverable, updateDeliverable } from "@/lib/domain/service";
import { updateDeliverableSchema } from "@/lib/validators/schemas";
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
    const input = updateDeliverableSchema.parse(payload);

    const deliverable = await updateDeliverable(user.id, id, input);
    return NextResponse.json({ deliverable }, { status: 200 });
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
    await deleteDeliverable(user.id, id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
