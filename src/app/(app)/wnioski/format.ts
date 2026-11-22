import { formsText, recipientLabel, submissionKindLabel } from "@/content/forms";
import type { FormSpec } from "@/server/forms";
import type { SubmissionRecord } from "@/server/submissions-repo";

const dateTime = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Warsaw" });

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

export function submissionTitle(sub: SubmissionRecord, forms: FormSpec[]): string {
  return sub.payload.title ?? forms.find((f) => f.slug === sub.kind)?.title ?? submissionKindLabel[sub.kind] ?? sub.kind;
}

export function submissionRecipient(sub: SubmissionRecord): string {
  return sub.payload.recipient ? recipientLabel[sub.payload.recipient] : recipientLabel.zus;
}

export { formsText };
