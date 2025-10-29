-- Custom Kong Plugin: Role-Based Authorization Handler
-- File: /usr/local/share/lua/5.1/kong/plugins/role-auth/handler.lua

local jwt_decoder = require "kong.plugins.jwt.jwt_parser"

local RoleAuthHandler = {
  PRIORITY = 900, -- Run after JWT plugin (1005) but before most others
  VERSION = "1.0.0",
}

function RoleAuthHandler:access(config)
  -- Get JWT token from Authorization header
  local authorization_header = kong.request.get_header("authorization")
  
  if not authorization_header then
    return kong.response.exit(401, { message = "Missing authorization header" })
  end

  -- Extract token (remove "Bearer " prefix)
  local token = authorization_header:match("Bearer%s+(.+)")
  if not token then
    return kong.response.exit(401, { message = "Invalid authorization header format" })
  end

  -- Decode JWT token (assumes JWT plugin already validated it)
  local jwt, err = jwt_decoder:new(token)
  if err then
    return kong.response.exit(401, { message = "Invalid JWT token: " .. err })
  end

  -- Get user role from JWT claims
  local claims = jwt.claims
  local user_role = claims[config.role_claim]
  
  if not user_role then
    return kong.response.exit(403, { message = "Missing role in token" })
  end

  -- Check if user role is allowed
  local allowed = false
  for _, allowed_role in ipairs(config.allowed_roles) do
    if user_role == allowed_role then
      allowed = true
      break
    end
  end

  if not allowed then
    kong.log.warn("Access denied for role: " .. user_role .. " on route: " .. kong.router.get_route().name)
    return kong.response.exit(403, { message = config.unauthorized_message })
  end

  -- Add user context headers for downstream services
  kong.service.request.set_header("X-User-ID", claims.sub)
  kong.service.request.set_header("X-User-Role", user_role)
  kong.service.request.set_header("X-User-Email", claims.email)
  
  kong.log.info("Access granted for role: " .. user_role .. " on route: " .. kong.router.get_route().name)
end

return RoleAuthHandler