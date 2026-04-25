variable "subscription_id" {
  type        = string
  description = "Azure Subscription ID"
}
variable "location" {
  type        = string
  default     = "Germany West Central"
  description = "Primary Azure region for all resources"
}
variable "openai_location" {
  type        = string
  default     = "Sweden Central"
  description = "Azure region for Azure OpenAI (must support OpenAI — e.g. swedencentral, eastus)"
}
variable "project" {
  type        = string
  default     = "egzamin-maklerski"
  description = "Project name used as resource prefix"
}
variable "storage_account_name" {
  type        = string
  description = "Globally unique storage account name (3-24 lowercase alphanumeric, no hyphens)"
}
variable "database_name" {
  type        = string
  default     = "exam_db"
  description = "MongoDB database name"
}
variable "backend_image" {
  type        = string
  description = "Backend container image (e.g. myacr.azurecr.io/backend:latest)"
}
variable "frontend_image" {
  type        = string
  description = "Frontend container image (e.g. myacr.azurecr.io/frontend:latest)"
}
variable "google_client_id" {
  type        = string
  description = "Google OAuth2 client ID"
}
variable "openai_deployment" {
  type        = string
  default     = "gpt-4.1-nano"
  description = "Azure OpenAI deployment name passed to the openai module."
}
variable "secrets" {
  type        = map(string)
  sensitive   = true
  description = "All sensitive secrets. Keys: google-client-secret, jwt-secret-key, grafana-admin-password, analytics-token."
}
variable "sql_admin_login" {
  type        = string
  default     = "sqladmin"
  description = "SQL Server administrator username."
}
variable "sql_admin_password" {
  type        = string
  sensitive   = true
  description = "SQL Server administrator password."
}
