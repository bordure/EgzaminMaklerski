variable "name" {
  type        = string
  description = <<-EOT
    Key Vault name — 3-24 alphanumeric + hyphens, globally unique.
    Example: "egzamin-maklerski-dev-kv"  (exactly 24 chars — do not exceed)
  EOT
}
variable "resource_group_name" {
  type        = string
  description = "Resource group name"
}
variable "location" {
  type        = string
  description = "Azure region"
}
variable "tenant_id" {
  type        = string
  description = "Azure AD tenant ID — use data.azurerm_client_config.current.tenant_id"
}
variable "terraform_object_id" {
  type        = string
  description = <<-EOT
    Object ID of the principal running Terraform (service principal or user).
    Use data.azurerm_client_config.current.object_id.
    This principal gets full secret permissions so it can write secrets during apply.
  EOT
}
variable "tags" {
  type    = map(string)
  default = {}
}
variable "secrets" {
  type        = map(string)
  sensitive   = true
  default     = {}
  description = "Map of secret name -> value to store in the Key Vault. Names must be 1-127 alphanumeric/hyphen chars."
}
