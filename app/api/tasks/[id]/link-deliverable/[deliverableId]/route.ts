import { NextResponse } from "next/server";
import { unlinkTaskFromDeliverable } from "@/lib/domain/service";
import { getUserOrNull } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/domain/http";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; deliverableId: string }> },
) {
  try {
    const user = await getUserOrNull();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, deliverableId } = await context.params;
    await unlinkTaskFromDeliverable(user.id, id, deliverableId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
