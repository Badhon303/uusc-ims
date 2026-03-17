// Helper to attach CORS headers for our custom endpoints
// This echoes back the origin if it's in our allow list and enables cookies
export const allowedOrigins = ['http://localhost:3000']

export const buildCorsHeaders = (request?: Request) => {
  const defaultHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    // even for OPTIONS we want the browser to know it can send cookies
    'Access-Control-Allow-Credentials': 'true',
  }

  if (!request) return defaultHeaders

  const origin = request.headers.get('origin') || ''
  if (allowedOrigins.includes(origin)) {
    return {
      ...defaultHeaders,
      'Access-Control-Allow-Origin': origin,
    }
  }

  // if the origin isn't allowed, set null to explicitly deny
  return {
    ...defaultHeaders,
    'Access-Control-Allow-Origin': 'null',
  }
}
