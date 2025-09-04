locals {
  # Add secrets to this list as required to make them available within the container.
  # Values must not be hardcoded here - they must either be references or updated in SSM Parameter Store.
  env_secrets = [
    {
      name = "DOMAIN"
      value = local.host
    },
    {
      name  = "DATA_S3_BUCKET"
      value = module.app_bucket.id
    },
    {
      name  = "SENTRY_DSN"
      value = var.SENTRY_DSN
    },
    {
      name  = "SENTRY_AUTH_TOKEN"
      value = var.SENTRY_AUTH_TOKEN
    },
    {
      name  = "AZURE_OPENAI_API_KEY"
      value = var.azure_openai_api_key
    },
    {
      name  = "OPENAI_API_KEY"
      value = var.openai_api_key
    },

    {
      name  = "AZURE_OPENAI_ENDPOINT"
      value = var.azure_openai_endpoint
    },

    {
      name  = "OPENAI_API_VERSION"
      value = var.openai_api_version
    },

    {
      name = "USE_LITE_LLM"
      value = var.use_lite_llm
    },

    {
      name  = "MCP_SERVERS"
      value = var.mcp_servers
    },

    {
      name  = "LANGFUSE_SECRET_KEY"
      value = var.langfuse_secret_key
    },
    {
      name = "LANGFUSE_BASE_URL",
      value = var.langfuse_base_url
    },
    {
      name  = "LANGFUSE_PUBLIC_KEY"
      value = var.langfuse_public_key
    },
    {
      name  = "POSTGRES_HOST"
      value = module.rds.db_instance_address
    },
    {
      name  = "POSTGRES_PORT"
      value = 5432
    },
    {
      name  = "POSTGRES_DB"
      value = module.rds.db_instance_name
    },
    {
      name  = "POSTGRES_USER"
      value = module.rds.rds_instance_username
    },
    {
      name  = "POSTGRES_PASSWORD"
      value = module.rds.rds_instance_db_password
    }
  ]
}

resource "aws_ssm_parameter" "env_secrets" {
  for_each = { for ev in local.env_secrets : ev.name => ev }
  
  type   = "SecureString"
  key_id = data.terraform_remote_state.platform.outputs.kms_key_arn

  name  = "/${local.name}/env_secrets/${each.value.name}"
  value = each.value.value

  lifecycle {
    ignore_changes = [
      value,
    ]
  }
}
