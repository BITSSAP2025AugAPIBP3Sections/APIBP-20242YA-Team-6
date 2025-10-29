-- Custom Kong Plugin: Role-Based Authorization
-- File: /usr/local/share/lua/5.1/kong/plugins/role-auth/schema.lua

local typedefs = require "kong.db.schema.typedefs"

return {
  name = "role-auth",
  fields = {
    { consumer = typedefs.no_consumer },
    { protocols = typedefs.protocols_http },
    { config = {
        type = "record",
        fields = {
          { allowed_roles = { type = "array", elements = { type = "string" }, default = {} } },
          { role_claim = { type = "string", default = "role" } },
          { unauthorized_message = { type = "string", default = "Insufficient permissions" } }
        },
      },
    },
  },
}