output "id" {
  value       = azurerm_storage_account.this.id
  description = "Resource ID"
}
output "name" {
  value       = azurerm_storage_account.this.name
  description = "Storage account name"
}
output "primary_access_key" {
  value       = azurerm_storage_account.this.primary_access_key
  sensitive   = true
  description = "Primary access key"
}
output "primary_connection_string" {
  value       = azurerm_storage_account.this.primary_connection_string
  sensitive   = true
  description = "Primary connection string"
}
