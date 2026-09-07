import { randomBytes } from "crypto";

export function generateQrToken() {
  return randomBytes(16).toString("hex");
}

export function formatEmployeeName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`;
}

export const leaveTypeLabels: Record<string, string> = {
  yillik: "Yıllık İzin",
  hastalik: "Hastalık",
  mazeret: "Mazeret",
};

export const leaveStatusLabels: Record<string, string> = {
  beklemede: "Beklemede",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
};

export const attendanceTypeLabels: Record<string, string> = {
  giris: "Giriş",
  cikis: "Çıkış",
};
