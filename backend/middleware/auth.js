import { supabase } from '../utils/supabase.js'

/**
 * Verifies the Supabase JWT from the Authorization header.
 * Attaches req.user = { id, email, role } on success.
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header.' })
  }

  const token = authHeader.split(' ')[1]

  // Verify the token with Supabase Auth
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }

  // Fetch the user's role from the users table
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, email, full_name, role, is_active')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return res.status(401).json({ error: 'User profile not found.' })
  }

  if (!profile.is_active) {
    return res.status(403).json({ error: 'Account is deactivated.' })
  }

  req.user = profile
  next()
}

/**
 * Factory: require the caller to have one of the given roles.
 * Always use AFTER requireAuth.
 *
 * @param {...string} roles - Allowed role names
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}.` })
    }
    next()
  }
}
