variable "image_tag" {
  description = "The tag of the image to use"
  type        = string
  default     = "latest"
}

variable "region" {
  type        = string
  description = "AWS region for infrastructure to be deployed to"
}

variable "state_bucket" {
  type        = string
  description = "Name of the S3 bucket to use a terraform state"
}

variable "domain_name" {
  type        = string
  description = "The base domain name for the project"
}

variable "env" {
  type        = string
  description = "environment"
  default     = "dev"
}

variable "project_name" {
  type        = string
  description = "Name of project"
}

variable "team_name" {
  type        = string
  description = "The name of the team"
}

variable "universal_tags" {
  type        = map(string)
  description = "Map to tag resources with"
}

variable "github_org" {
  type        = string
  default     = "github.com/i-dot-ai/"
  description = "The default I.AI GitHub Org URL"
}

variable "repository_name" {
  type        = string
  description = "The GitHub repository name"
}

variable "deployed_via" {
  type        = string
  default     = "GitHub_Actions"
  description = "Mechanism for how the Infra was deployed."
}

variable "security_level" {
  type        = string
  default     = "base"
  description = "Security Level of the infrastructure."
}

variable "azure_openai_api_key" {
  type        = string
  description = "Connect to Azure API"
  sensitive   = true
}

variable "azure_openai_endpoint" {
  type        = string
  description = "Connect to Azure API"
}

variable "openai_api_version" {
  type        = string
  description = "Connect to Azure API"
}

variable "use_lite_llm" {
  type        = string
  description = "Whether to use Lite LLM"
}

variable "mcp_servers" {
  type        = string
  description = "JSON format - this overrides .mcp-servers.yaml"
  sensitive   = true
}

variable "langfuse_secret_key" {
  type        = string
  description = "Langfuse secret key"
  sensitive   = true
}

variable "langfuse_public_key" {
  type        = string
  description = "Langfuse public key"
  sensitive   = true
}

variable "SENTRY_DSN" {
  type        = string
  description = "DSN for sentry logs"
  sensitive   = true
}

variable "SENTRY_AUTH_TOKEN" {
  type        = string
  description = "Sentry auth token for log pushing"
  sensitive   = true
}
