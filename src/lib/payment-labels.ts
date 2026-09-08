export type PaymentType = "prim" | "mesai" | "avans";

export const PAYMENT_LABELS: Record<PaymentType, string> = {
  prim: "Prim",
  mesai: "Fazla mesai ücreti",
  avans: "Avans",
};

export function isPaymentType(value: string): value is PaymentType {
  return value === "prim" || value === "mesai" || value === "avans";
}
