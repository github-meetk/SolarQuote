import { z } from 'zod';

export const leadStatuses = [
  'NEW',
  'CONTACTED',
  'DESIGNED',
  'PROPOSAL_SENT',
  'WON',
  'LOST',
] as const;
export const leadStatusSchema = z.enum(leadStatuses);
export type LeadStatus = z.infer<typeof leadStatusSchema>;
export const leadInputSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  phone: z.string().trim().min(6),
  address: z.string().trim().min(5),
});
export const statusUpdateSchema = z.object({ status: leadStatusSchema });
export const projectInputSchema = z.object({
  leadId: z.string().cuid(),
  roofAreaM2: z.number().positive().max(10000),
  annualConsumptionKwh: z.number().positive().max(100000),
  roofTiltDeg: z.number().min(0).max(90),
  roofAzimuthDeg: z.number().min(-180).max(180),
  batteryIncluded: z.boolean(),
  electricityPriceEurKwh: z.number().positive().max(5),
});
export const simulationInputSchema = projectInputSchema.omit({ leadId: true });
export const simulationSchema = z.object({
  systemSizeKwp: z.number(),
  annualYieldKwh: z.number(),
  selfConsumptionPct: z.number(),
  annualSavingsEur: z.number(),
  systemCostEur: z.number(),
  paybackYears: z.number(),
  monthlyYieldKwh: z.array(z.number()).length(12),
});
export type LeadInput = z.infer<typeof leadInputSchema>;
export type ProjectInput = z.infer<typeof projectInputSchema>;
export type Simulation = z.infer<typeof simulationSchema>;
