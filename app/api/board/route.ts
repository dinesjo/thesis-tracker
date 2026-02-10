import { NextResponse } from "next/server";
import { getBoardData } from "@/lib/domain/service";
import { getUserOrNull } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/domain/http";

export async function GET() {
  try {
    const user = await getUserOrNull();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const board = await getBoardData(user.id);
    return NextResponse.json(board, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
