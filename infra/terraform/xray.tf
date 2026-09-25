data "aws_iam_policy_document" "otel_collector_assume_role" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"

    condition {
      test     = "StringEquals"
      variable = "${replace(module.eks.oidc_provider, "https://", "")}:sub"
      values   = ["system:serviceaccount:default:otel-collector"]
    }

    condition {
      test     = "StringEquals"
      variable = "${replace(module.eks.oidc_provider, "https://", "")}:aud"
      values   = ["sts.amazonaws.com"]
    }

    principals {
      type        = "Federated"
      identifiers = [module.eks.oidc_provider_arn]
    }
  }
}

resource "aws_iam_role" "otel_collector" {
  name               = "${var.cluster_name}-otel-collector"
  assume_role_policy = data.aws_iam_policy_document.otel_collector_assume_role.json
}

resource "aws_iam_role_policy_attachment" "otel_collector_xray" {
  role       = aws_iam_role.otel_collector.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

output "otel_collector_role_arn" {
  value = aws_iam_role.otel_collector.arn
}