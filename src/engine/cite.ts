/** Citation constructors and the citations used across stages. */
import type { Citation } from "./types";

export const UZ = (article: string): Citation => ({ act: "UZ", article });
export const KP = (article: string): Citation => ({ act: "KP", article });
export const RD = (article: string): Citation => ({ act: "RD", article });
export const RW = (article: string): Citation => ({ act: "RW", article });
export const USUS = (article: string): Citation => ({ act: "USUS", article });
export const KC = (article: string): Citation => ({ act: "KC", article });

export const C = {
  insuredAtEvent: [UZ("29 ust. 1")],
  voluntary: [USUS("14 ust. 1"), USUS("11 ust. 2")],
  ulgaNaStart: [USUS("18a")],
  sham: [USUS("83 ust. 1"), KC("83 § 1")],
  afterTitle: [UZ("30 ust. 1"), KP("177 § 3")],
  art30PreBirth: [UZ("30 ust. 3"), RD("§ 17")],
  maternityLength: [KP("180 § 1"), UZ("29 ust. 1")],
  preBirth: [KP("180 § 2")],
  motherMinimum: [KP("180 § 4"), UZ("29 ust. 3")],
  motherSpecial: [KP("180 § 6–13"), UZ("29 ust. 5–7")],
  loss: [KP("180¹ § 1–2")],
  adoption: [KP("183 § 1–3"), UZ("29 ust. 1 pkt 2–3")],
  adoptionParental: [KP("183 § 4–4⁵")],
  supplementary: [KP("180²")],
  parental: [KP("182¹a"), UZ("29a ust. 3–4")],
  parentalParts: [KP("182¹c"), KP("182¹d § 2"), UZ("29a ust. 1")],
  parentalWork: [KP("182¹e"), KP("182¹f"), UZ("31 ust. 4a")],
  paternity: [KP("182³"), UZ("31 ust. 1")],
  rate100: [UZ("31 ust. 1")],
  rate70: [UZ("31 ust. 2")],
  rate815: [UZ("30a ust. 1"), UZ("31 ust. 3")],
  rateNineWeeks: [UZ("31 ust. 3f")],
  rateFirstYear: [UZ("31 ust. 3g"), UZ("31 ust. 4")],
  rateSickness: [UZ("11 ust. 1–2")],
  sickPay: [KP("92 § 1")],
  baseEmployee: [UZ("36 ust. 1–4"), UZ("47")],
  baseMonths: [UZ("38 ust. 2–3")],
  baseFirstMonth: [UZ("37")],
  baseWorkTime: [UZ("40")],
  baseBonuses: [UZ("41–42")],
  baseNoRecalc: [UZ("43")],
  baseFloor: [UZ("45")],
  baseAfterTitleCap: [UZ("46")],
  baseNonEmployee: [UZ("48 ust. 1–2"), UZ("3 pkt 4")],
  baseArt48a: [UZ("48a")],
  baseNonEmployeeFirst: [UZ("49")],
  baseDaily: [UZ("36 ust. 3")],
  topUp: [UZ("31 ust. 3a–3c"), UZ("62 ust. 4–6")],
  arrears: [UZ("2a")],
  waiting: [UZ("4")],
  benefitPeriod: [UZ("8"), UZ("9 ust. 2")],
  sickAfterTitle: [UZ("7"), UZ("13")],
  payer: [UZ("61 ust. 1–2")],
  forwarding: [UZ("61b ust. 5")],
  limitation: [UZ("67")],
};
