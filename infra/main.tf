terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Local state for now (fine for a solo demo project). Once this matters
  # beyond learning, move to an S3 backend + DynamoDB lock table instead.
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "shopfront"
      ManagedBy   = "terraform"
      Environment = var.environment
    }
  }
}
// protection test
