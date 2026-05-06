variable "name" {
  type        = string
  description = "Storage account name — 3-24 lowercase alphanumeric chars, globally unique, no hyphens"
}
variable "resource_group_name" {
  type        = string
  description = "Resource group name"
}
variable "location" {
  type        = string
  description = "Azure region"
}
variable "tags" {
  type    = map(string)
  default = {}
}
variable "blob_container_name" {
  type        = string
  default     = ""
  description = "If non-empty, a blob container with this name is created and blob_uploads are written to it."
}
variable "blob_uploads" {
  type = map(object({
    source      = string
    content_type = optional(string, "application/json")
  }))
  default     = {}
  description = "Map of blob name -> { source = local file path }. Requires blob_container_name to be set."
}
