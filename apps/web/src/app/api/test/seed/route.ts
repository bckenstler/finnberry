import { NextResponse } from "next/server";
import { prisma } from "@finnberry/db";
import { randomBytes } from "crypto";
import {
  generateAllDemoData,
  generateMedicineRecords,
} from "./demo-data-generators";

// Only allow in development/test environments
const isTestEnv = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

export async function POST(request: Request) {
  if (!isTestEnv) {
    return NextResponse.json(
      { error: "Test endpoints are only available in development/test environments" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "createTestUser":
        return await createTestUser(body);
      case "createTestSession":
        return await createTestSession(body);
      case "createTestHousehold":
        return await createTestHousehold(body);
      case "createTestChild":
        return await createTestChild(body);
      case "cleanup":
        return await cleanup(body);
      case "createDemoAccount":
        return await createDemoAccount();
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Test seed error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

async function createTestUser({ email, name }: { email: string; name: string }) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: {
      email,
      name,
      emailVerified: new Date(),
    },
  });

  return NextResponse.json({ user });
}

async function createTestSession({ userId }: { userId: string }) {
  // Generate a unique session token
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const session = await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  return NextResponse.json({ session, sessionToken });
}

async function createTestHousehold({
  name,
  userId,
}: {
  name: string;
  userId: string;
}) {
  const household = await prisma.household.create({
    data: {
      name,
      members: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
    include: {
      members: true,
    },
  });

  return NextResponse.json({ household });
}

async function createTestChild({
  name,
  birthDate,
  householdId,
  gender,
}: {
  name: string;
  birthDate: string;
  householdId: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
}) {
  const child = await prisma.child.create({
    data: {
      name,
      birthDate: new Date(birthDate),
      householdId,
      gender,
    },
  });

  return NextResponse.json({ child });
}

async function cleanup({ prefix = "e2e-test" }: { prefix?: string }) {
  // Delete test data in correct order (respecting foreign keys)

  // Delete tracking records for test children
  const testChildren = await prisma.child.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const childIds = testChildren.map((c) => c.id);

  if (childIds.length > 0) {
    await prisma.sleepRecord.deleteMany({ where: { childId: { in: childIds } } });
    await prisma.feedingRecord.deleteMany({ where: { childId: { in: childIds } } });
    await prisma.diaperRecord.deleteMany({ where: { childId: { in: childIds } } });
    await prisma.pumpingRecord.deleteMany({ where: { childId: { in: childIds } } });
    await prisma.growthRecord.deleteMany({ where: { childId: { in: childIds } } });
    await prisma.activityRecord.deleteMany({ where: { childId: { in: childIds } } });

    // Medicine records need to be deleted via medicines (medicineRecord doesn't have childId directly)
    const testMedicines = await prisma.medicine.findMany({
      where: { childId: { in: childIds } },
      select: { id: true },
    });
    const medicineIds = testMedicines.map((m) => m.id);
    if (medicineIds.length > 0) {
      await prisma.medicineRecord.deleteMany({ where: { medicineId: { in: medicineIds } } });
    }
    await prisma.medicine.deleteMany({ where: { childId: { in: childIds } } });
  }

  // Delete test children
  await prisma.child.deleteMany({
    where: { name: { startsWith: prefix } },
  });

  // Delete test households (cascades to members and invites)
  const testHouseholds = await prisma.household.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const householdIds = testHouseholds.map((h) => h.id);

  if (householdIds.length > 0) {
    await prisma.householdInvite.deleteMany({ where: { householdId: { in: householdIds } } });
    await prisma.householdMember.deleteMany({ where: { householdId: { in: householdIds } } });
    await prisma.household.deleteMany({ where: { id: { in: householdIds } } });
  }

  // Delete test sessions
  const testUsers = await prisma.user.findMany({
    where: { email: { startsWith: prefix } },
    select: { id: true },
  });
  const userIds = testUsers.map((u) => u.id);

  if (userIds.length > 0) {
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
  }

  // Delete test users
  await prisma.user.deleteMany({
    where: { email: { startsWith: prefix } },
  });

  return NextResponse.json({
    deleted: {
      users: userIds.length,
      households: householdIds.length,
      children: childIds.length,
    },
  });
}

async function createDemoAccount() {
  const DEMO_EMAIL = "demo@finnberry.app";
  const DEMO_NAME = "Demo Parent";
  const HOUSEHOLD_NAME = "Demo Family";
  const CHILD_NAME = "Demo Baby";
  const DAYS_OF_DATA = 14;

  // 1. Delete existing demo account if present
  const existingUser = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    include: {
      householdMemberships: {
        include: {
          household: {
            include: {
              children: true,
            },
          },
        },
      },
    },
  });

  if (existingUser) {
    // Delete all related data
    for (const membership of existingUser.householdMemberships) {
      for (const child of membership.household.children) {
        // Delete all tracking records
        await prisma.sleepRecord.deleteMany({ where: { childId: child.id } });
        await prisma.feedingRecord.deleteMany({ where: { childId: child.id } });
        await prisma.diaperRecord.deleteMany({ where: { childId: child.id } });
        await prisma.pumpingRecord.deleteMany({ where: { childId: child.id } });
        await prisma.growthRecord.deleteMany({ where: { childId: child.id } });
        await prisma.temperatureRecord.deleteMany({ where: { childId: child.id } });
        await prisma.activityRecord.deleteMany({ where: { childId: child.id } });

        // Delete medicines and their records
        const medicines = await prisma.medicine.findMany({
          where: { childId: child.id },
        });
        for (const medicine of medicines) {
          await prisma.medicineRecord.deleteMany({ where: { medicineId: medicine.id } });
        }
        await prisma.medicine.deleteMany({ where: { childId: child.id } });
      }

      // Delete children
      await prisma.child.deleteMany({ where: { householdId: membership.householdId } });

      // Delete household members and invites
      await prisma.householdInvite.deleteMany({ where: { householdId: membership.householdId } });
      await prisma.householdMember.deleteMany({ where: { householdId: membership.householdId } });

      // Delete household
      await prisma.household.delete({ where: { id: membership.householdId } });
    }

    // Delete sessions and user
    await prisma.session.deleteMany({ where: { userId: existingUser.id } });
    await prisma.account.deleteMany({ where: { userId: existingUser.id } });
    await prisma.user.delete({ where: { id: existingUser.id } });
  }

  // 2. Create user
  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: DEMO_NAME,
      emailVerified: new Date(),
    },
  });

  // 3. Create session (24hr expiry)
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires,
    },
  });

  // 4. Create household
  const household = await prisma.household.create({
    data: {
      name: HOUSEHOLD_NAME,
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
    },
  });

  // 5. Create child (6 months old)
  const birthDate = new Date();
  birthDate.setMonth(birthDate.getMonth() - 6);

  const child = await prisma.child.create({
    data: {
      name: CHILD_NAME,
      birthDate,
      householdId: household.id,
      gender: "FEMALE",
    },
  });

  // 6. Generate and insert all demo data
  const demoData = generateAllDemoData(child.id, DAYS_OF_DATA);

  // Insert records using createMany for efficiency
  const [
    sleepResult,
    feedingResult,
    diaperResult,
    pumpingResult,
    growthResult,
    temperatureResult,
    activityResult,
  ] = await Promise.all([
    prisma.sleepRecord.createMany({
      data: demoData.sleepRecords,
    }),
    prisma.feedingRecord.createMany({
      data: demoData.feedingRecords,
    }),
    prisma.diaperRecord.createMany({
      data: demoData.diaperRecords,
    }),
    prisma.pumpingRecord.createMany({
      data: demoData.pumpingRecords,
    }),
    prisma.growthRecord.createMany({
      data: demoData.growthRecords,
    }),
    prisma.temperatureRecord.createMany({
      data: demoData.temperatureRecords,
    }),
    prisma.activityRecord.createMany({
      data: demoData.activityRecords,
    }),
  ]);

  // Create medicines and their records
  let medicineRecordCount = 0;
  for (const medicineDef of demoData.medicines) {
    const medicine = await prisma.medicine.create({
      data: medicineDef,
    });

    const medicineRecords = generateMedicineRecords(
      medicine.id,
      medicineDef.name,
      new Date(),
      DAYS_OF_DATA
    );

    if (medicineRecords.length > 0) {
      const result = await prisma.medicineRecord.createMany({
        data: medicineRecords,
      });
      medicineRecordCount += result.count;
    }
  }

  // 7. Return summary
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    session: {
      sessionToken,
      expires: session.expires,
    },
    household: {
      id: household.id,
      name: household.name,
    },
    child: {
      id: child.id,
      name: child.name,
      birthDate: child.birthDate,
      gender: child.gender,
    },
    recordCounts: {
      sleep: sleepResult.count,
      feeding: feedingResult.count,
      diaper: diaperResult.count,
      pumping: pumpingResult.count,
      growth: growthResult.count,
      temperature: temperatureResult.count,
      activity: activityResult.count,
      medicines: demoData.medicines.length,
      medicineRecords: medicineRecordCount,
    },
  });
}
