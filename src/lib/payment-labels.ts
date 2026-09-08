export type PaymentType = "prim" | "mesai";

export const PAYMENT_LABELS: Record<PaymentType, string> = {
  prim: "Prim",
  mesai: "Fazla mesai ücreti",
};
