variable "name" {
  type        = string
  description = "Name of the Cosmos DB account (must be globally unique, lowercase, hyphens allowed)"
}
variable "resource_group_name" {
  type        = string
  description = "Resource group name"
}
variable "location" {
  type        = string
  description = "Azure region"
}
variable "enable_free_tier" {
  type        = bool
  default     = false
  description = <<-EOT
    Enable Cosmos DB free tier (first 1 000 RU/s and 25 GB free).
    Azure allows only ONE free-tier account per subscription.
    Use true for dev; use false with serverless = true for prd.
  EOT
}
variable "serverless" {
  type        = bool
  default     = false
  description = "Enable serverless capacity mode. Cannot be used together with enable_free_tier = true."
}
variable "database_name" {
  type        = string
  default     = "exam_db"
  description = "Name of the MongoDB database to create"
}
variable "allowed_cidrs" {
  type        = list(string)
  default     = []
  description = "List of IP addresses/CIDRs allowed to access CosmosDB. Pass the CAE static IP here."
}
variable "tags" {
  type    = map(string)
  default = {}
}
