import { Users } from 'lucide-react';

/**
 * States that HR is copied on the outgoing email.
 *
 * The CC is applied server-side by `_add_hr_cc` in
 * `curcle-be/app/services/email_sender.py`, which reads `settings.hr_cc_email`
 * and dedupes it against the recipient. It is not a choice HR makes per send,
 * so this is a statement, not a control -- there is deliberately nothing to
 * toggle here. The address is named so the sender knows where the copy lands.
 */
export function HrCcNotice({ className }: { className?: string }) {
  return (
    <p className={`flex items-center gap-1.5 text-[11px] text-gray-500 ${className ?? ''}`}>
      <Users size={12} className="shrink-0 text-gray-400" />
      HR is copied on this email (hr@optiminastic.com).
    </p>
  );
}
