// Heuristic-only check for obviously fake phone numbers — repeating digits
// (9999999999) or sequential runs (1234567890, 9876543210). This can't
// prove a number is real (only real OTP verification could), it just flags
// the "someone mashed the keyboard" case for a human to double-check before
// spending time on a lead. False negatives are expected and fine — this is
// a triage hint, not a filter.
export function isSuspiciousPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
  if (digits.length !== 10) return false;

  if (new Set(digits).size === 1) return true;

  let ascending = true;
  let descending = true;
  for (let i = 1; i < digits.length; i++) {
    const diff = Number(digits[i]) - Number(digits[i - 1]);
    if (diff !== 1) ascending = false;
    if (diff !== -1) descending = false;
  }
  return ascending || descending;
}
