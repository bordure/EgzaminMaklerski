variable "name" {
  type        = string
  description = "Name of the Function App. Also used as the base for the Service Plan: <name>-plan."
}
variable "resource_group_name" {
  type        = string
  description = "Resource group to deploy into."
}
variable "location" {
  type        = string
  description = "Azure region."
}
variable "storage_account_name" {
  type        = string
  description = "Name of the storage account (used for AzureWebJobsStorage)."
}
variable "storage_account_access_key" {
  type        = string
  sensitive   = true
  description = "Primary access key for AzureWebJobsStorage."
}
variable "functions_dir" {
  type        = string
  description = "Absolute local path to the directory that contains function_app.py, host.json, and requirements.txt."
}
variable "app_settings" {
  type        = map(string)
  default     = {}
  sensitive   = true
  description = "Additional app settings (env vars) passed to the function app. All values must be strings. Marked sensitive to avoid leaking secrets in plan output."
}
variable "sku_name" {
  type        = string
  default     = "Y1"
  description = "Service Plan SKU. Y1 = Linux Consumption (scale-to-zero, pay-per-execution). EP1/EP2 = Elastic Premium (always-on)."
}
variable "tags" {
  type    = map(string)
  default = {}
}
