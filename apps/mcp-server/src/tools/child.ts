import type { PrismaClient } from "@finnberry/db";
import { differenceInMonths, differenceInDays } from "date-fns";

export async function handleChildTools(
  name: string,
  _args: Record<string, unknown>,
  prisma: PrismaClient
): Promise<unknown> {
  switch (name) {
    case "list-children": {
      const children = await prisma.child.findMany({
        include: {
          household: {
            select: { name: true },
          },
        },
        orderBy: { name: "asc" },
      });

      return {
        count: children.length,
        children: children.map((child) => {
          const now = new Date();
          const months = differenceInMonths(now, child.birthDate);
          const days = differenceInDays(now, child.birthDate) % 30;

          return {
            id: child.id,
            name: child.name,
            birthDate: child.birthDate.toISOString().split("T")[0],
            age: months > 0 ? `${months} months, ${days} days` : `${days} days`,
            gender: child.gender,
            household: child.household.name,
          };
        }),
      };
    }

    default:
      throw new Error(`Unknown child tool: ${name}`);
  }
}
