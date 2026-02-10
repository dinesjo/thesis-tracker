import { NextRequest, NextResponse } from "next/server";
import { getProjectForUser, updateProject } from "@/lib/domain/service";
import { getUserOrNull } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/domain/http";
import { updateProjectSchema } from "@/lib/validators/schemas";

export async function GET() {
  try {
    const user = await getUserOrNull();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await getProjectForUser(user.id);
    return NextResponse.json({ project }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserOrNull();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const input = updateProjectSchema.parse(payload);
    const project = await updateProject(user.id, input);

    return NextResponse.json({ project }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
