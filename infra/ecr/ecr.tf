locals {
  ecr_services = [
    "api-gateway",
    "auth-service",
    "cart-service",
    "email-service",
    "frontend",
    "inventory-service",
    "notification-service",
    "order-service",
    "payment-service",
    "product-service",
    "recommendation-service",
    "review-service",
    "search-service",
    "shipping-service",
  ]
}

data "aws_caller_identity" "current" {}

resource "aws_ecr_repository" "service" {
  for_each = toset(local.ecr_services)

  # Same naming as GHCR (shopfront-<service>) so the Helm templates don't change
  name = "shopfront-${each.key}"

  # Mutable because CI moves the "latest" and "stable" tags on every build/release
  image_tag_mutability = "MUTABLE"

  # Lets terraform destroy remove repos that still contain images (fine for a demo)
  force_delete = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Keep storage cost down: only the 20 most recent images per repo
resource "aws_ecr_lifecycle_policy" "service" {
  for_each   = aws_ecr_repository.service
  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 20 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 20
      }
      action = { type = "expire" }
    }]
  })
}

output "ecr_registry" {
  description = "Registry address to use as image.registry in Helm values"
  value       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.region}.amazonaws.com"
}