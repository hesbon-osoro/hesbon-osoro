terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Native S3 state locking (Terraform >= 1.10), no DynamoDB table required.
  backend "s3" {
    bucket       = "hesbon-terraform-state"
    key          = "platform/production/terraform.tfstate"
    region       = "eu-west-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = "eu-west-1"

  default_tags {
    tags = {
      Environment = "production"
      Repository  = "hesbon-osoro/hesbon-osoro"
      CostCenter  = "platform"
    }
  }
}

module "platform" {
  source = "../../modules/platform"

  name               = "commerce-prod"
  kubernetes_version = "1.30"
  az_count           = 3
  node_capacity      = { min = 3, desired = 3, max = 12 }
  github_repository  = "hesbon-osoro/hesbon-osoro"
  cluster_admin_arns = ["arn:aws:iam::123456789012:role/platform-admins"]
}

output "cluster_name" {
  value = module.platform.cluster_name
}

output "github_deploy_role_arn" {
  value = module.platform.github_deploy_role_arn
}

output "orders_api_role_arn" {
  value = module.platform.orders_api_role_arn
}
