import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  const users = [
    { name: "Admin User", email: "admin@example.com", password: "admin123", role: "admin" as const },
    { name: "Sarah Johnson", email: "sarah@example.com", password: "member123", role: "member" as const },
    { name: "James Smith", email: "james@example.com", password: "member123", role: "member" as const },
  ];

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await db
      .insert(usersTable)
      .values({ name: user.name, email: user.email, passwordHash, role: user.role })
      .onConflictDoNothing();
    console.log(`  ✓ ${user.email}`);
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
