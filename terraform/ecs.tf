locals {
  frontend_port          = 8081
  additional_policy_arns = { for idx, arn in [aws_iam_policy.ecs_exec_custom_policy.arn] : idx => arn }
  llm_gateway_name       = var.env == "dev" || var.env == "preprod" ? "llm-gateway.${var.env}" : "llm-gateway"
  llm_gateway_url        = "https://${local.llm_gateway_name}.i.ai.gov.uk"
}

module "frontend" {
  name = "${local.name}-frontend"
  # checkov:skip=CKV_SECRET_4:Skip secret check as these have to be used within the Github Action
  # checkov:skip=CKV_TF_1: We're using semantic versions instead of commit hash
  #source                      = "../../i-dot-ai-core-terraform-modules//modules/infrastructure/ecs" # For testing local changes
  source                       = "git::https://github.com/i-dot-ai/i-dot-ai-core-terraform-modules.git//modules/infrastructure/ecs?ref=v5.4.0-ecs"
  image_tag                    = var.image_tag
  ecr_repository_uri           = "public.ecr.aws/idotai/gov-ai-client"
  vpc_id                       = data.terraform_remote_state.vpc.outputs.vpc_id
  private_subnets              = data.terraform_remote_state.vpc.outputs.private_subnets
  host                         = local.host
  load_balancer_security_group = module.load_balancer.load_balancer_security_group_id
  aws_lb_arn                   = module.load_balancer.alb_arn
  ecs_cluster_id               = data.terraform_remote_state.platform.outputs.ecs_cluster_id
  ecs_cluster_name             = data.terraform_remote_state.platform.outputs.ecs_cluster_name
  create_listener              = true
  certificate_arn              = data.terraform_remote_state.universal.outputs.certificate_arn
  target_group_name_override   = "gov-ai-client-fe-${var.env}-tg"
  permissions_boundary_name    = "infra/i-dot-ai-${var.env}-gov-ai-client-perms-boundary-app"
  task_additional_iam_policies = local.additional_policy_arns

  environment_variables = {
    "ENVIRONMENT" : terraform.workspace,
    "APP_NAME" : "${local.name}-frontend"
    "PORT" : local.frontend_port,
    "REPO" : "gov-ai-client",
    "DOCKER_BUILDER_CONTAINER" : "gov-ai-client",
    "AUTH_PROVIDER_PUBLIC_KEY" : data.aws_ssm_parameter.auth_provider_public_key.value,

    "LLM_GATEWAY_URL" : local.llm_gateway_url
  }

  secrets = concat([
    for k, v in aws_ssm_parameter.env_secrets : {
      name      = regex("([^/]+$)", v.arn)[0], # Extract right-most string (param name) after the final slash
      valueFrom = v.arn
    }],
    [
      {
        name  = "LITELLM_GOVAI_CLIENT_OPENAI_API_KEY"
        valueFrom = data.aws_ssm_parameter.litellm_api_key.arn
  }])

  container_port = local.frontend_port

  health_check = {
    accepted_response   = 200
    path                = "/api/health"
    interval            = 60
    timeout             = 70
    healthy_threshold   = 2
    unhealthy_threshold = 5
    port                = local.frontend_port
  }

  authenticate_keycloak = {
    enabled : true,
    realm_name : data.terraform_remote_state.keycloak.outputs.realm_name,
    client_id : var.project_name,
    client_secret : data.aws_ssm_parameter.client_secret.value,
    keycloak_dns : data.terraform_remote_state.keycloak.outputs.keycloak_dns
  }
}


resource "aws_service_discovery_private_dns_namespace" "private_dns_namespace" {
  name        = "${local.name}-internal"
  description = "${local.name} private dns namespace"
  vpc         = data.terraform_remote_state.vpc.outputs.vpc_id
}


module "sns_topic" {
  # checkov:skip=CKV_TF_1: We're using semantic versions instead of commit hash
  # source                       = "../../i-dot-ai-core-terraform-modules/modules/observability/cloudwatch-slack-integration"
  source        = "git::https://github.com/i-dot-ai/i-dot-ai-core-terraform-modules.git//modules/observability/cloudwatch-slack-integration?ref=v2.0.1-cloudwatch-slack-integration"
  name          = local.name
  slack_webhook = data.aws_secretsmanager_secret_version.platform_slack_webhook.secret_string

  permissions_boundary_name = "infra/i-dot-ai-${var.env}-gov-ai-client-perms-boundary-app"
}

module "frontend-ecs-alarm" {
  # checkov:skip=CKV_TF_1: We're using semantic versions instead of commit hash
  # source                       = "../../i-dot-ai-core-terraform-modules/modules/observability/ecs-alarms"
  source           = "git::https://github.com/i-dot-ai/i-dot-ai-core-terraform-modules.git//modules/observability/ecs-alarms?ref=v1.0.1-ecs-alarms"
  name             = "${local.name}-frontend"
  ecs_service_name = module.frontend.ecs_service_name
  ecs_cluster_name = data.terraform_remote_state.platform.outputs.ecs_cluster_name
  sns_topic_arn    = [module.sns_topic.sns_topic_arn]
}

module "frontend-alb-alarm" {
  # checkov:skip=CKV_TF_1: We're using semantic versions instead of commit hash
  # source                       = "../../i-dot-ai-core-terraform-modules/modules/observability/alb-alarms"
  source        = "git::https://github.com/i-dot-ai/i-dot-ai-core-terraform-modules.git//modules/observability/alb-alarms?ref=v1.1.0-alb-alarms"
  name          = "${local.name}-frontend"
  alb_arn       = module.load_balancer.alb_arn
  target_group  = module.frontend.aws_lb_target_group_name
  sns_topic_arn = [module.sns_topic.sns_topic_arn]
}
