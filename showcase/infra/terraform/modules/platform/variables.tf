variable "name" {
  description = "Name prefix for every resource, e.g. \"commerce-prod\"."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,30}$", var.name))
    error_message = "name must be 3-31 chars of lowercase letters, digits and hyphens."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC. Subnets are carved out of it automatically."
  type        = string
  default     = "10.40.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones to spread subnets and nodes across."
  type        = number
  default     = 3

  validation {
    condition     = var.az_count >= 2 && var.az_count <= 4
    error_message = "az_count must be between 2 and 4 for a highly available cluster."
  }
}

variable "kubernetes_version" {
  description = "EKS control plane version."
  type        = string
  default     = "1.30"
}

variable "node_instance_types" {
  description = "Instance types for the default managed node group, in preference order."
  type        = list(string)
  default     = ["m7g.large", "m6g.large"]
}

variable "node_capacity" {
  description = "Autoscaling bounds for the default node group."
  type = object({
    min     = number
    desired = number
    max     = number
  })
  default = { min = 3, desired = 3, max = 12 }

  validation {
    condition     = var.node_capacity.min <= var.node_capacity.desired && var.node_capacity.desired <= var.node_capacity.max
    error_message = "node_capacity must satisfy min <= desired <= max."
  }
}

variable "cluster_admin_arns" {
  description = "IAM principals granted cluster-admin through EKS access entries."
  type        = list(string)
  default     = []
}

variable "github_repository" {
  description = "GitHub \"owner/repo\" allowed to push images and deploy via OIDC."
  type        = string
}

variable "ecr_repositories" {
  description = "Container repositories to create."
  type        = set(string)
  default     = ["orders-api"]
}

variable "tags" {
  description = "Tags applied to every resource."
  type        = map(string)
  default     = {}
}
