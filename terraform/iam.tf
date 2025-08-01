data "aws_iam_policy_document" "ecs_exec_custom_policy" {
  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject",
    ]
    resources = [
      "${module.app_bucket.arn}/app_data/*",
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
    ]
    resources = [
      "arn:aws:ssm:*:${data.aws_caller_identity.current.account_id}:parameter/${local.name}/env_secrets/*",
      "arn:aws:ssm:*:${data.aws_caller_identity.current.account_id}:parameter/${var.team_name}-${var.env}-core-llm-gateway/env_secrets/*",
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey",
      "kms:DescribeKey",
    ]
    resources = [
      data.terraform_remote_state.platform.outputs.kms_key_arn,
    ]
  }
}

resource "aws_iam_policy" "ecs_exec_custom_policy" {
  name        = "${local.name}-ecs-custom-exec"
  description = "ECS task custom policy"
  policy      = data.aws_iam_policy_document.ecs_exec_custom_policy.json
}
