import { NextRequest, NextResponse } from "next/server";
import { createDeliverable, listDeliverablesForUser } from "@/lib/domain/service";
import { createDeliverableSchema } from "@/lib/validators/schemas";
import { getUserOrNull } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/domain/http";

export async function GET() {
  try {
    const user = await getUserOrNull();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await listDeliverablesForUser(user.id);
    return NextResponse.json({ deliverables: items }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserOrNull();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const input = createDeliverableSchema.parse(payload);
    const deliverable = await createDeliverable(user.id, input);

    return NextResponse.json({ deliverable }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
