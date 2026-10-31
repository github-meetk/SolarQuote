import { spawn } from 'node:child_process';
import { simulationSchema, type Simulation } from '@solarquote/shared';
import { config } from './config.js';
type Input = {
  roofAreaM2: number;
  annualConsumptionKwh: number;
  roofTiltDeg: number;
  roofAzimuthDeg: number;
  batteryIncluded: boolean;
  electricityPriceEurKwh: number;
};
export async function runSimulation(input: Input): Promise<Simulation> {
  const child = spawn(config.SIMULATOR_PATH, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const result = await new Promise<string>((resolve, reject) => {
    let output = '';
    let error = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Simulation timed out'));
    }, 5000);
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      error += chunk.toString();
    });
    child.on('error', () => {
      clearTimeout(timer);
      reject(new Error(error || 'Simulator unavailable'));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      code === 0
        ? resolve(output)
        : reject(new Error(error || 'Simulation failed'));
    });
    child.stdin.write(
      JSON.stringify({
        roof_area_m2: input.roofAreaM2,
        annual_consumption_kwh: input.annualConsumptionKwh,
        tilt_deg: input.roofTiltDeg,
        azimuth_deg: input.roofAzimuthDeg,
        battery_included: input.batteryIncluded,
        electricity_price_eur_kwh: input.electricityPriceEurKwh,
      }),
    );
    child.stdin.end();
  });
  return simulationSchema.parse(JSON.parse(result));
}
