import { buildCorsHeaders } from '@/utils/cors/corsHandler'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { APIError } from 'payload'

// Define the structure of the expected request body
// Note: In a real app, this interface should ideally live in a shared 'types' folder

interface RegisterBody {
  email: string
  password: string
  name: string
  contactNumber: string
  address: string
  role: 'member' | 'student' | 'guest'
}

export const OPTIONS = async (request: Request) => {
  // Respond to preflight requests with CORS headers
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  })
}

export const POST = async (request: Request) => {
  // 1. Get the Payload instance
  const payload = await getPayload({
    config: configPromise,
  })

  try {
    // 2. Parse the request body and cast it to the defined type
    const { email, password, name, contactNumber, address, role } =
      (await request.json()) as RegisterBody

    if (!email || !password || !name || !contactNumber || !role) {
      throw new APIError('Missing required fields.', 400)
    }

    // Security Check: Restrict roles for registration
    const allowedRegistrationRoles = ['member', 'student', 'guest']
    if (!allowedRegistrationRoles.includes(role)) {
      throw new APIError('Invalid role selected for registration.', 400)
    }

    // --- Validation Checks ---
    // Basic validation for email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new APIError('Invalid email address format.', 400)
    }

    // Stronger basic password check (e.g., minimum 8 characters)
    if (password.length < 4) {
      throw new APIError('Password must be at least 4 characters long.', 400)
    }

    // 3. Create the new user using Payload's local API
    // Payload automatically handles password hashing.
    await payload.create({
      collection: 'users',
      data: {
        email,
        password,
        role,
        name,
        contactNumber,
        address,
      },
      draft: false, // Ensure the user is created immediately
      overrideAccess: true,
    })

    // 4. Log the user in immediately after successful registration
    // This sets the authentication cookie/session on the response.
    const userResponse = await payload.login({
      collection: 'users',
      data: {
        email,
        password,
      },
      req: request, // CRUCIAL: Pass the original request to Payload
      overrideAccess: false,
      showHiddenFields: false,
    })

    // 5. Return a success response (Use 201 Created status)
    return Response.json(
      {
        message: 'Registration successful and user logged in.',
        ...userResponse,
      },
      { status: 201, headers: buildCorsHeaders(request) },
    )
  } catch (error: any) {
    // 6. Handle errors
    console.error('Registration error:', error)
    return Response.json(
      {
        errors: {
          name: 'RegistrationError',
          data: error.data || null,
          message: error.message || 'An error occurred during registration.',
        },
      },
      {
        status: error.status || 500,
        headers: buildCorsHeaders(request),
      },
    )
  }
}
