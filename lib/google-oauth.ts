export function googleOAuthRedirectUri(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const host = forwardedHost || request.headers.get("host") || requestUrl.host;
  const protocol = forwardedProtocol || requestUrl.protocol.replace(":", "");
  return `${protocol}://${host}/api/auth/google/callback`;
}
