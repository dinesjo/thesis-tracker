import { NextRequest, NextResponse } from "next/server";
import { getUserOrNull } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/domain/http";
import { updatePhases } from "@/lib/domain/service";
import { updatePhasesSchema } from "@/lib/validators/schemas";

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserOrNull();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const input = updatePhasesSchema.parse(payload);
    const phases = await updatePhases(user.id, input);

    return NextResponse.json({ phases }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
