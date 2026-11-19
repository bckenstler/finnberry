import { NextResponse } from "next/server";
import { prisma } from "@finnberry/db";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { z } from "zod";
import {
  generateAllDemoData,
  generateMedicineRecords,
} from "./demo-data-generators";

// Every user, household and child this endpoint creates or deletes carries
// this prefix, so it cannot reach an account a person actually uses.
const TEST_PREFIX = "e2e-test";
const SECRET_HEADER = "x-test-seed-secret";
const MIN_SECRET_LENGTH = 16;

// Hashing first gives timingSafeEqual the equal-length inputs it requires.
function secretsMatch(given: string, expected: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

// This endpoint signs in as any test user and deletes data with nobody signed
// in. It answers only where someone turned it on deliberately: not in a
// production build, with the opt-in flag set, to a caller holding the secret.
function isCallAllowed(request: Request): boolean {
  const secret = process.env.TEST_SEED_SECRET ?? "";
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.ENABLE_TEST_SEED !== "1") return false;
  if (secret.length < MIN_SECRET_LENGTH) return false;
  return secretsMatch(request.headers.get(SECRET_HEADER) ?? "", secret);
}

const testName = z.string().max(200).startsWith(TEST_PREFIX);
const recordId = z.string().min(1).max(64);

const seedRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("createTestUser"),
    email: z.string().email().max(200).startsWith(TEST_PREFIX),
    name: testName,
    // Approved unless a test asks otherwise, so that the fixtures land on the
    // dashboard and not on the approval screen.
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("APPROVED"),
  }),
  z.object({ action: z.literal("createTestSession"), userId: recordId }),
  z.object({
    action: z.literal("createTestHousehold"),
    name: testName,
    userId: recordId,
  }),
  z.object({
    action: z.literal("createTestChild"),
    name: testName,
    birthDate: z.string().datetime(),
    householdId: recordId,
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  }),
  z.object({ action: z.literal("cleanup") }),
  z.object({ action: z.literal("createDemoAccount") }),
]);

type SeedRequest = z.infer<typeof seedRequestSchema>;
type SeedAction<A extends SeedRequest["action"]> = Extract<SeedRequest, { action: A }>;

const notATestRecord = () =>
  NextResponse.json({ error: "Not a test record" }, { status: 400 });

export async function POST(request: Request) {
  if (!isCallAllowed(request)) {
    return new NextResponse(null, { status: 404 });
  }

  const parsed = seedRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid seed request" }, { status: 400 });
  }
  const seedRequest = parsed.data;

  try {
    switch (seedRequest.action) {
      case "createTestUser":
        return await createTestUser(seedRequest);
      case "createTestSession":
        return await createTestSession(seedRequest);
      case "createTestHousehold":
        return await createTestHousehold(seedRequest);
      case "createTestChild":
        return await createTestChild(seedRequest);
      case "cleanup":
        return await cleanup();
      case "createDemoAccount":
        return await createDemoAccount();
    }
  } catch (error) {
    console.error("Test seed error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

async function isTestUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return user?.email?.startsWith(TEST_PREFIX) === true;
}

async function createTestUser({ email, name, status }: SeedAction<"createTestUser">) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, status },
    create: {
      email,
      name,
      emailVerified: new Date(),
      status,
    },
  });

  return NextResponse.json({ user });
}

async function createTestSession({ userId }: SeedAction<"createTestSession">) {
  if (!(await isTestUser(userId))) return notATestRecord();

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

async function createTestHousehold({ name, userId }: SeedAction<"createTestHousehold">) {
  if (!(await isTestUser(userId))) return notATestRecord();

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
}: SeedAction<"createTestChild">) {
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    select: { name: true },
  });
  if (!household?.name.startsWith(TEST_PREFIX)) return notATestRecord();

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

async function cleanup() {
  const prefix = TEST_PREFIX;
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
      status: "APPROVED",
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
