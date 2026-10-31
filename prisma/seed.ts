import { PrismaClient, LeadStatus } from '@prisma/client';
const prisma = new PrismaClient();
const names = [
  'Anna Müller',
  'Thomas Schneider',
  'Familie Weber',
  'Katrin Fischer',
  'Jonas Becker',
  'Sophie Wagner',
  'Michael Hoffmann',
  'Claudia Richter',
  'Peter Klein',
  'Nina Wolf',
  'Markus Neumann',
  'Lena Schwarz',
];
const towns = [
  'Freiburg',
  'Ulm',
  'Augsburg',
  'München',
  'Stuttgart',
  'Regensburg',
  'Kassel',
  'Bonn',
  'Münster',
  'Leipzig',
  'Dresden',
  'Potsdam',
];
const statuses: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'DESIGNED',
  'PROPOSAL_SENT',
  'WON',
  'LOST',
];
async function main() {
  await prisma.proposal.deleteMany();
  await prisma.simulation.deleteMany();
  await prisma.project.deleteMany();
  await prisma.lead.deleteMany();
  for (let index = 0; index < names.length; index += 1) {
    const lead = await prisma.lead.create({
      data: {
        name: names[index],
        email: `${names[index].toLowerCase().replaceAll(' ', '.')}@beispiel.de`,
        phone: `+49 170 ${String(1200000 + index * 7311)}`,
        address: `${['Hauptstraße', 'Gartenweg', 'Sonnenallee'][index % 3]} ${8 + index}, ${towns[index]}`,
        status: statuses[index % statuses.length],
      },
    });
    if (index < 6) {
      const project = await prisma.project.create({
        data: {
          leadId: lead.id,
          roofAreaM2: 90 + index * 18,
          annualConsumptionKwh: 3600 + index * 420,
          roofTiltDeg: 25 + index,
          roofAzimuthDeg: index % 2 === 0 ? 0 : -20,
          batteryIncluded: index % 2 === 0,
          electricityPriceEurKwh: 0.32,
        },
      });
      const size = Math.min(
        project.roofAreaM2 * 0.2,
        project.annualConsumptionKwh / 950,
      );
      const yieldKwh = size * 950;
      const cost = size * 1400 + (project.batteryIncluded ? 6000 : 0);
      const savings =
        yieldKwh *
        (project.batteryIncluded ? 0.65 : 0.3) *
        project.electricityPriceEurKwh;
      await prisma.simulation.create({
        data: {
          projectId: project.id,
          systemSizeKwp: size,
          annualYieldKwh: yieldKwh,
          selfConsumptionPct: project.batteryIncluded ? 65 : 30,
          annualSavingsEur: savings,
          systemCostEur: cost,
          paybackYears: cost / savings,
          monthlyYieldKwh: [
            45, 70, 105, 125, 140, 145, 150, 135, 105, 75, 50, 35,
          ].map((factor) => factor * size),
        },
      });
      if (index < 4)
        await prisma.proposal.create({
          data: {
            projectId: project.id,
            publicId: `sonnen-${lead.id.slice(-8)}`,
            summary: `Ihr Solarstromkonzept mit ${size.toFixed(1)} kWp und ${project.batteryIncluded ? 'Batteriespeicher' : 'hohem Eigenverbrauch'}.`,
            totalPriceEur: cost,
          },
        });
    }
  }
}
main().finally(() => prisma.$disconnect());
