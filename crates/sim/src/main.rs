use serde::{Deserialize, Serialize};
use std::io::{self, Read};

#[derive(Deserialize)] struct Input { roof_area_m2: f64, annual_consumption_kwh: f64, tilt_deg: f64, azimuth_deg: f64, battery_included: bool, electricity_price_eur_kwh: f64 }
#[derive(Serialize)] struct Output { system_size_kwp: f64, annual_yield_kwh: f64, self_consumption_pct: f64, annual_savings_eur: f64, system_cost_eur: f64, payback_years: f64, monthly_yield_kwh: Vec<f64> }
fn simulate(input: &Input) -> Result<Output, String> {
    if input.roof_area_m2 <= 0.0 || input.annual_consumption_kwh <= 0.0 || input.electricity_price_eur_kwh <= 0.0 || !(0.0..=90.0).contains(&input.tilt_deg) || !(-180.0..=180.0).contains(&input.azimuth_deg) { return Err("Dachfläche, Verbrauch und Strompreis müssen positiv sein; Neigung oder Azimut sind ungültig.".into()); }
    let size = (input.roof_area_m2 * 0.2).min(input.annual_consumption_kwh / 950.0);
    let tilt_factor = 1.0 - ((input.tilt_deg - 35.0).abs() / 180.0);
    let azimuth_factor = 1.0 - (input.azimuth_deg.abs() / 180.0) * 0.18;
    let annual = size * 950.0 * tilt_factor * azimuth_factor;
    let seasonal = [0.045, 0.065, 0.095, 0.11, 0.125, 0.13, 0.135, 0.12, 0.095, 0.07, 0.05, 0.04];
    let monthly = seasonal.iter().map(|factor| annual * factor).collect::<Vec<_>>();
    let self_pct = if input.battery_included { 65.0 } else { 30.0 };
    let savings = annual * self_pct / 100.0 * input.electricity_price_eur_kwh;
    let cost = size * 1400.0 + if input.battery_included { 6000.0 } else { 0.0 };
    Ok(Output { system_size_kwp: round(size), annual_yield_kwh: round(annual), self_consumption_pct: self_pct, annual_savings_eur: round(savings), system_cost_eur: round(cost), payback_years: round(cost / savings), monthly_yield_kwh: monthly.into_iter().map(round).collect() })
}
fn round(value: f64) -> f64 { (value * 100.0).round() / 100.0 }
fn main() { let mut raw = String::new(); io::stdin().read_to_string(&mut raw).unwrap(); match serde_json::from_str::<Input>(&raw).map_err(|error| error.to_string()).and_then(|input| simulate(&input)) { Ok(output) => println!("{}", serde_json::to_string(&output).unwrap()), Err(error) => { eprintln!("{}", serde_json::json!({"error": error})); std::process::exit(1); } } }
#[cfg(test)] mod tests { use super::*; fn input() -> Input { Input { roof_area_m2: 100.0, annual_consumption_kwh: 4000.0, tilt_deg: 35.0, azimuth_deg: 0.0, battery_included: false, electricity_price_eur_kwh: 0.32 } } #[test] fn calculates_size() { assert_eq!(simulate(&input()).unwrap().system_size_kwp, 4.0); } #[test] fn caps_size_by_consumption() { let mut value = input(); value.annual_consumption_kwh = 1000.0; assert!(simulate(&value).unwrap().system_size_kwp < 1.1); } #[test] fn battery_increases_self_consumption() { let mut value = input(); value.battery_included = true; assert_eq!(simulate(&value).unwrap().self_consumption_pct, 65.0); } #[test] fn rejects_zero_area() { let mut value = input(); value.roof_area_m2 = 0.0; assert!(simulate(&value).is_err()); } #[test] fn rejects_bad_tilt() { let mut value = input(); value.tilt_deg = 91.0; assert!(simulate(&value).is_err()); } #[test] fn returns_twelve_months() { assert_eq!(simulate(&input()).unwrap().monthly_yield_kwh.len(), 12); } #[test] fn azimuth_reduces_yield() { let mut value = input(); value.azimuth_deg = 180.0; assert!(simulate(&value).unwrap().annual_yield_kwh < simulate(&input()).unwrap().annual_yield_kwh); } }