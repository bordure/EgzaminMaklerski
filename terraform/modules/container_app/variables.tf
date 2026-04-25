variable "name" {
  type        = string
  description = "Name of the Container App"
}
variable "resource_group_name" {
  type        = string
  description = "Resource group name"
}
variable "container_app_environment_id" {
  type        = string
  description = "ID of the Container App Environment"
}
variable "image" {
  type        = string
  description = "Container image (e.g. myregistry.azurecr.io/app:latest)"
}
variable "cpu" {
  type        = number
  default     = 0.25
  description = "vCPU allocation per instance (0.25, 0.5, 0.75, 1.0, ...)"
}
variable "memory" {
  type        = string
  default     = "0.5Gi"
  description = "Memory allocation per instance (must match cpu: 0.25->0.5Gi, 0.5->1Gi)"
}
variable "min_replicas" {
  type        = number
  default     = 0
  description = "Minimum replicas. Set to 0 to allow scale-to-zero (free when idle)."
}
variable "max_replicas" {
  type        = number
  default     = 1
  description = "Maximum replicas"
}
variable "target_port" {
  type        = number
  default     = 80
  description = "Port the container listens on"
}
variable "external_ingress" {
  type        = bool
  default     = true
  description = "Whether ingress is publicly accessible"
}
variable "env_vars" {
  type = list(object({
    name        = string
    value       = optional(string, null)
    secret_name = optional(string, null)
  }))
  default     = []
  description = "Environment variables. Use secret_name to reference a declared secret."
}
variable "secrets" {
  type = list(object({
    name  = string
    value = string
  }))
  default     = []
  sensitive   = true
  description = "Secrets injected into the container. Reference via env_vars[].secret_name."
}
variable "tags" {
  type    = map(string)
  default = {}
}
variable "volumes" {
  type = list(object({
    name         = string
    storage_type = optional(string, "AzureFile")
    storage_name = optional(string, null)
  }))
  default     = []
  description = "Storage volumes to attach. Each must have a matching azurerm_container_app_environment_storage registered under storage_name."
}
variable "volume_mounts" {
  type = list(object({
    name = string
    path = string
  }))
  default     = []
  description = "Mount points for the volumes defined above. name must match a volumes[].name."
}
variable "startup_probe_path" {
  type        = string
  default     = null
  description = "HTTP path for the startup probe (e.g. '/health'). If null, no startup probe is configured and Azure uses its default TCP probe."
}
variable "custom_domain_names" {
  type        = list(string)
  default     = []
  description = "List of custom hostnames to bind (e.g. 'devbackend.egzaminmaklerski.online'). DNS CNAME + asuid TXT records must exist before applying. Certificate binding starts as Disabled; use the Azure portal or CLI to attach a free managed certificate — Terraform will not overwrite it (lifecycle ignore_changes)."
}
