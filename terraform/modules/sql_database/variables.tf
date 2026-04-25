variable "server_name" {
  type        = string
  description = "Azure SQL Server name — globally unique, 1-63 lowercase alphanumeric/hyphens."
}
variable "resource_group_name" {
  type        = string
  description = "Resource group name."
}
variable "location" {
  type        = string
  description = "Azure region."
}
variable "administrator_login" {
  type        = string
  description = "SQL Server administrator username."
}
variable "administrator_password" {
  type        = string
  sensitive   = true
  description = "SQL Server administrator password. Min 12 chars, must include upper/lower/digit/special."
}
variable "allowed_ips" {
  type        = list(string)
  default     = []
  description = "List of IP addresses allowed to reach the SQL Server. Pass the CAE static IP here."
}
variable "allow_azure_services" {
  type        = bool
  default     = true
  description = "Add the 0.0.0.0/0.0.0.0 Azure SQL firewall rule that enables access from Azure-hosted services (e.g. Azure Functions on Consumption plan). This is equivalent to the portal 'Allow Azure services and resources' checkbox."
}
variable "tags" {
  type    = map(string)
  default = {}
}
