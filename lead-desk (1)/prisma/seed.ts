import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const contractors = await Promise.all([
    db.contractor.create({
      data: { name: "Mike Torres", company: "Torres Roofing", phone: "305-555-0101",
        niches: "roofing", zips: "33101,33130,33133", freeLeadsLimit: 2 },
    }),
    db.contractor.create({
      data: { name: "Dana Kessler", company: "Sunbelt Roofing Co", phone: "305-555-0102",
        niches: "roofing,gutters", zips: "33101,33139", freeLeadsLimit: 2 },
    }),
    db.contractor.create({
      data: { name: "Rob Alvarez", company: "Coastal Exteriors", phone: "305-555-0103",
        niches: "roofing,gutters,insulation", zips: "33130,33101", freeLeadsLimit: 2 },
    }),
  ]);

  const lead = await db.lead.create({
    data: {
      name: "Janet Ruiz", phone: "305-555-9911", email: "janet.ruiz@example.com",
      address: "412 Palm Ave, Miami, FL 33101", zip: "33101", niche: "roofing",
      jobDetails: "Metal roof replacement, ~1,800 sq ft, hurricane damage, wants quote this week.",
      source: "juicefactorydigital.com/roofing-miami", priceCents: 3500,
    },
  });

  await db.claim.createMany({
    data: contractors
      .filter((c) => c.zips.includes("33101"))
      .map((c) => ({ leadId: lead.id, contractorId: c.id })),
  });

  console.log("Seeded", contractors.length, "contractors and 1 lead.");
}

main().finally(() => db.$disconnect());
