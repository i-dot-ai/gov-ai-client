module "load_balancer" {
  # checkov:skip=CKV_TF_1: We're using semantic versions instead of commit hash
  #source           = "../../i-dot-ai-core-terraform-modules//modules/infrastructure/load_balancer" # For testing local changes
  source            = "git::https://github.com/i-dot-ai/i-dot-ai-core-terraform-modules.git//modules/infrastructure/load_balancer?ref=v2.0.1-load_balancer"
  name              = local.name
  account_id        = data.aws_caller_identity.current.account_id
  vpc_id            = data.terraform_remote_state.vpc.outputs.vpc_id
  public_subnets    = data.terraform_remote_state.vpc.outputs.public_subnets
<<<<<<< found
  ip_whitelist      = concat(var.internal_ips, var.developer_ips)
||||||| expected
  ip_whitelist      = var.ip_whitelist
=======
>>>>>>> replacement
  certificate_arn   = data.terraform_remote_state.universal.outputs.certificate_arn
  web_acl_arn       = module.waf.web_acl_arn
  env               = var.env 
  
}

module "waf" {
  # checkov:skip=CKV_TF_1: We're using semantic versions instead of commit hash
  #source        = "../../i-dot-ai-core-terraform-modules//modules/infrastructure/waf" # For testing local changes
<<<<<<< found
  source         = "git::https://github.com/i-dot-ai/i-dot-ai-core-terraform-modules.git//modules/infrastructure/waf?ref=v5.2.0-waf"
  name           = local.name
  ip_set         = concat(var.internal_ips, var.developer_ips)
  host           = local.host
||||||| expected
  source         = "git::https://github.com/i-dot-ai/i-dot-ai-core-terraform-modules.git//modules/infrastructure/waf?ref=v5.2.0-waf"
  name           = local.name
  ip_set         = var.ip_whitelist
  host           = local.host
=======
  source         = "git::https://github.com/i-dot-ai/i-dot-ai-core-terraform-modules.git//modules/infrastructure/waf?ref=v6.0.0-waf"
  name           = local.name
  host           = local.host
  env            = var.env
>>>>>>> replacement
}

resource "aws_route53_record" "type_a_record" {
  zone_id = data.terraform_remote_state.account.outputs.hosted_zone_id
  name    = local.host
  type    = "A"

<<<<<<< found
  alias {
    name                   = module.load_balancer.load_balancer_dns_name
    zone_id                = module.load_balancer.load_balancer_zone_id
||||||| expected


resource "aws_route53_record" "type_a_record_backend" {
  zone_id = var.hosted_zone_id
  name    = local.host_backend
  type    = "A"
=======


resource "aws_route53_record" "type_a_record_backend" {
  zone_id = data.terraform_remote_state.account.outputs.hosted_zone_id
  name    = local.host_backend
  type    = "A"
>>>>>>> replacement
    evaluate_target_health = true
  }
}

