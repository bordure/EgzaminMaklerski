output "id" {
  value       = azurerm_cosmosdb_account.this.id
  description = "Resource ID of the Cosmos DB account"
}
output "account_name" {
  value       = azurerm_cosmosdb_account.this.name
  description = "Name of the Cosmos DB account"
}
output "endpoint" {
  value       = azurerm_cosmosdb_account.this.endpoint
  description = "Document endpoint URI"
}
output "connection_string" {
  value       = azurerm_cosmosdb_account.this.primary_mongodb_connection_string
  sensitive   = true
  description = "Primary MongoDB connection string"
}
