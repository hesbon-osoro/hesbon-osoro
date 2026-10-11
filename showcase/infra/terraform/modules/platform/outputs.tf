output "cluster_name" {
  description = "EKS cluster name, for `aws eks update-kubeconfig`."
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Kubernetes API server endpoint."
  value       = module.eks.cluster_endpoint
}

output "vpc_id" {
  description = "ID of the platform VPC."
  value       = module.vpc.vpc_id
}

output "ecr_repository_urls" {
  description = "Push URLs keyed by repository short name."
  value       = { for k, r in aws_ecr_repository.this : k => r.repository_url }
}

output "github_deploy_role_arn" {
  description = "Role for aws-actions/configure-aws-credentials in CI."
  value       = aws_iam_role.github_deploy.arn
}

output "orders_api_role_arn" {
  description = "IRSA role to annotate on the orders-api ServiceAccount."
  value       = aws_iam_role.orders_api.arn
}
