// src/app/api/preferences/gender/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { genderPref } = await req.json();
  if (!genderPref) return NextResponse.json({ error: "Missing genderPref" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const updated = await prisma.userPreferences.upsert({
    where: { userId: user.id },
    update: { genderPref },
    create: { userId: user.id, genderPref },
  });

  return NextResponse.json({ success: true, data: updated });
}
