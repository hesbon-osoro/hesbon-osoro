data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, var.az_count)

  # /20 private subnets for pods (VPC CNI uses real VPC IPs), /24 public and
  # intra subnets for load balancers and the control-plane ENIs.
  private_subnets = [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 4, i)]
  public_subnets  = [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 8, 48 + i)]
  intra_subnets   = [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 8, 52 + i)]

  tags = merge(var.tags, {
    "platform/name"      = var.name
    "platform/managedBy" = "terraform"
  })
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.13"

  name = var.name
  cidr = var.vpc_cidr
  azs  = local.azs

  private_subnets = local.private_subnets
  public_subnets  = local.public_subnets
  intra_subnets   = local.intra_subnets

  enable_nat_gateway     = true
  one_nat_gateway_per_az = true # no cross-AZ dependency for egress
  enable_dns_hostnames   = true

  enable_flow_log                      = true
  create_flow_log_cloudwatch_log_group = true
  create_flow_log_cloudwatch_iam_role  = true
  flow_log_max_aggregation_interval    = 60

  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
    "karpenter.sh/discovery"          = var.name
  }

  tags = local.tags
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.24"

  cluster_name    = var.name
  cluster_version = var.kubernetes_version

  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.private_subnets
  control_plane_subnet_ids = module.vpc.intra_subnets

  cluster_endpoint_public_access = true
  enable_irsa                    = true

  # Envelope-encrypt Kubernetes Secrets with a customer-managed KMS key.
  cluster_encryption_config = {
    resources = ["secrets"]
  }

  cluster_enabled_log_types = ["api", "audit", "authenticator"]

  authentication_mode                      = "API"
  enable_cluster_creator_admin_permissions = false
  access_entries = {
    for i, arn in var.cluster_admin_arns : "admin-${i}" => {
      principal_arn = arn
      policy_associations = {
        admin = {
          policy_arn   = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = { type = "cluster" }
        }
      }
    }
  }

  cluster_addons = {
    coredns                = { most_recent = true }
    kube-proxy             = { most_recent = true }
    eks-pod-identity-agent = { most_recent = true }
    vpc-cni = {
      most_recent    = true
      before_compute = true
      configuration_values = jsonencode({
        # NetworkPolicy enforcement without running Calico.
        enableNetworkPolicy = "true"
        env                 = { ENABLE_PREFIX_DELEGATION = "true" }
      })
    }
  }

  eks_managed_node_groups = {
    default = {
      ami_type       = "AL2023_ARM_64_STANDARD"
      instance_types = var.node_instance_types
      capacity_type  = "ON_DEMAND"

      min_size     = var.node_capacity.min
      desired_size = var.node_capacity.desired
      max_size     = var.node_capacity.max

      update_config = { max_unavailable_percentage = 33 }

      metadata_options = {
        http_tokens                 = "required" # IMDSv2 only
        http_put_response_hop_limit = 1          # pods cannot reach node credentials
      }

      labels = { "workload-class" = "general" }
    }
  }

  tags = local.tags
}
