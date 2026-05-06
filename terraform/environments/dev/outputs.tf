output "resource_group_name" {
  value       = azurerm_resource_group.this.name
  description = "Name of the dev resource group"
}
output "frontend_url" {
  value       = "https://${module.frontend.fqdn}"
  description = "Public URL of the frontend — set as var.frontend_url and re-apply"
}
output "backend_url" {
  value       = "https://${module.backend.fqdn}"
  description = "Public URL of the backend — set as var.backend_url and re-apply"
}
output "grafana_url" {
  value       = "https://${module.grafana.fqdn}"
  description = "Public URL of Grafana"
}
output "openai_endpoint" {
  value       = module.openai.endpoint
  description = "Azure OpenAI endpoint URL"
}
output "sql_server_fqdn" {
  value       = module.sql.server_fqdn
  description = "Fully qualified domain name of the SQL Server"
}
output "cosmosdb_account_name" {
  value       = module.cosmosdb.account_name
  description = "Cosmos DB account name"
}
output "google_redirect_uri" {
  value       = "https://${module.backend.fqdn}/auth/google/callback"
  description = "Google OAuth2 redirect URI — set as var.google_redirect_uri and re-apply"
}
output "key_vault_uri" {
  value       = module.key_vault.vault_uri
  description = "Key Vault URI"
}
output "blob_to_mongo_url" {
  value       = module.functions.blob_to_mongo_url
  description = "POST this URL (with x-functions-key header) to refresh MongoDB from Blob Storage"
}
output "learning_advisor_url" {
  value       = module.functions.learning_advisor_url
  description = "POST this URL (with x-functions-key header) to get a personalised study plan"
}
