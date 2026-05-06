variable "name" {
  type        = string
  description = <<-EOT
    Name of the Azure OpenAI account. Also used as the custom subdomain.
    Must be globally unique across all Azure tenants. Max 24 lowercase alphanumeric + hyphens.
    Example: "egzamin-dev-ai" (do not exceed 24 chars)
  EOT
}
variable "resource_group_name" {
  type        = string
  description = "Resource group name"
}
variable "location" {
  type        = string
  description = <<-EOT
    Azure region for Azure OpenAI. Not all regions support Azure OpenAI.
    Supported regions include: eastus, eastus2, swedencentral, westus, westeurope, northeurope.
    Check https://learn.microsoft.com/azure/ai-services/openai/concepts/models for current availability.
  EOT
}
variable "deployment_name" {
  type        = string
  default     = "gpt-4.1-nano"
  description = "Name of the Azure OpenAI model deployment. Must match an available model in the region."
}
variable "model_version" {
  type        = string
  default     = "2025-04-14"
  description = "Model version string as shown in Azure OpenAI Studio."
}
variable "deployment_capacity" {
  type        = number
  default     = 10
  description = "Provisioned throughput capacity in thousands of tokens per minute (TPM). Used with GlobalStandard SKU."
}
variable "tags" {
  type    = map(string)
  default = {}
}
