import { NextRequest, NextResponse } from "next/server";
import { linkTaskToDeliverable } from "@/lib/domain/service";
import { linkDeliverableSchema } from "@/lib/validators/schemas";
import { getUserOrNull } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/domain/http";

export async function POST(
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
    const input = linkDeliverableSchema.parse(payload);

    await linkTaskToDeliverable(user.id, id, input.deliverableId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
