import { auth } from "@/auth";
import { findUserById } from "@/lib/auth/users";

export type AppUser = {
  id: string;
  username: string | null;
};

export async function getUserOrNull(): Promise<AppUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) {
    return null;
  }

  const user = await findUserById(id);
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
  };
}
