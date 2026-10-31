import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { randomBytes } from 'node:crypto';
import {
  leadInputSchema,
  leadStatusSchema,
  projectInputSchema,
} from '@solarquote/shared';
import { config } from './config.js';
import { prisma } from './db.js';
import { runSimulation } from './simulator.js';

export const app = Fastify({ logger: true });
await app.register(cors, { origin: config.WEB_ORIGIN });
await app.register(sensible);
app.get('/health', async () => ({ status: 'ok' }));
app.get('/api/leads', async () =>
  prisma.lead.findMany({
    include: {
      project: {
        include: {
          simulations: { orderBy: { createdAt: 'desc' }, take: 1 },
          proposal: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  }),
);
app.post('/api/leads', async (request, reply) => {
  const parsed = leadInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest(JSON.stringify(parsed.error.flatten()));
  return reply.code(201).send(await prisma.lead.create({ data: parsed.data }));
});
app.get('/api/leads/:id', async (request, reply) => {
  const lead = await prisma.lead.findUnique({
    where: { id: (request.params as { id: string }).id },
    include: {
      project: {
        include: {
          simulations: { orderBy: { createdAt: 'desc' }, take: 1 },
          proposal: true,
        },
      },
    },
  });
  return lead ? lead : reply.notFound('Lead not found');
});
app.patch('/api/leads/:id/status', async (request, reply) => {
  const parsed = leadStatusSchema.safeParse(
    (request.body as { status?: unknown }).status,
  );
    if (!parsed.success) return reply.badRequest(JSON.stringify(parsed.error.flatten()));
  try {
    return await prisma.lead.update({
      where: { id: (request.params as { id: string }).id },
      data: { status: parsed.data },
    });
  } catch {
    return reply.notFound('Lead not found');
  }
});
app.post('/api/projects', async (request, reply) => {
  const parsed = projectInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest(JSON.stringify(parsed.error.flatten()));
  try {
    return reply
      .code(201)
      .send(
        await prisma.project.upsert({
          where: { leadId: parsed.data.leadId },
          update: parsed.data,
          create: parsed.data,
        }),
      );
  } catch {
    return reply.notFound('Lead not found');
  }
});
app.get('/api/projects/:id', async (request, reply) => {
  const project = await prisma.project.findUnique({
    where: { id: (request.params as { id: string }).id },
    include: {
      lead: true,
      simulations: { orderBy: { createdAt: 'desc' }, take: 1 },
      proposal: true,
    },
  });
  return project ? project : reply.notFound('Project not found');
});
app.post('/api/projects/:id/simulate', async (request, reply) => {
  const id = (request.params as { id: string }).id;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return reply.notFound('Project not found');
  try {
    const simulation = await runSimulation(project);
    await prisma.lead.update({
      where: { id: project.leadId },
      data: { status: 'DESIGNED' },
    });
    return await prisma.simulation.create({
      data: {
        ...simulation,
        monthlyYieldKwh: simulation.monthlyYieldKwh,
        projectId: id,
      },
    });
  } catch (error) {
    return reply.internalServerError(
      error instanceof Error ? error.message : 'Simulation failed',
    );
  }
});
app.post('/api/projects/:id/proposal', async (request, reply) => {
  const id = (request.params as { id: string }).id;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      lead: true,
      simulations: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  const simulation = project?.simulations[0];
  if (!project || !simulation)
    return reply.badRequest('Run a simulation before generating a proposal');
  const proposal = await prisma.proposal.upsert({
    where: { projectId: id },
    update: {},
    create: {
      projectId: id,
      publicId: `angebot-${randomBytes(5).toString('hex')}`,
      summary: `Für ${project.lead.name}: ${simulation.systemSizeKwp.toFixed(1)} kWp Solarstrom mit ${project.batteryIncluded ? 'Batteriespeicher' : 'hohem Eigenverbrauch'}.`,
      totalPriceEur: simulation.systemCostEur,
    },
  });
  await prisma.lead.update({
    where: { id: project.leadId },
    data: { status: 'PROPOSAL_SENT' },
  });
  return reply.code(201).send(proposal);
});
app.get('/api/proposals/:publicId', async (request, reply) => {
  const proposal = await prisma.proposal.findUnique({
    where: { publicId: (request.params as { publicId: string }).publicId },
    include: {
      project: {
        include: {
          lead: true,
          simulations: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
  });
  return proposal ? proposal : reply.notFound('Proposal not found');
});
if (process.env.NODE_ENV !== 'test')
  app.listen({ port: config.API_PORT, host: '0.0.0.0' }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
