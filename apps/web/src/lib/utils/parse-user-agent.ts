/**
 * Best-effort human-readable label from a raw User-Agent string.
 * Falls back to "Unknown device" if the UA is missing or unrecognisable.
 */
export function describeUserAgent(ua: string | null): string {
  if (!ua) return 'Unknown device';

  const lower = ua.toLowerCase();

  // Bots first
  if (lower.includes('bot') || lower.includes('crawler')) return 'Bot';
  if (lower.includes('curl')) return 'Command line (curl)';
  if (lower.includes('postman')) return 'Postman';

  // Browser
  let browser = 'Unknown browser';
  if (lower.includes('edg/')) browser = 'Edge';
  else if (lower.includes('chrome/') && !lower.includes('edg/')) browser = 'Chrome';
  else if (lower.includes('firefox/')) browser = 'Firefox';
  else if (lower.includes('safari/') && !lower.includes('chrome/')) browser = 'Safari';
  else if (lower.includes('opr/') || lower.includes('opera')) browser = 'Opera';

  // OS
  let os = 'Unknown OS';
  if (lower.includes('windows')) os = 'Windows';
  else if (lower.includes('mac os') || lower.includes('macintosh')) os = 'macOS';
  else if (lower.includes('android')) os = 'Android';
  else if (lower.includes('iphone') || lower.includes('ipad')) os = 'iOS';
  else if (lower.includes('linux')) os = 'Linux';

  return `${browser} on ${os}`;
}
