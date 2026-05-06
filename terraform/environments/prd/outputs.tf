output "resource_group_name" {
  value       = azurerm_resource_group.this.name
  description = "Name of the prd resource group"
}
output "frontend_url" {
  value       = "https://${local.frontend_custom_domain}"
  description = "Public URL of the frontend"
}
output "backend_url" {
  value       = "https://${local.backend_custom_domain}"
  description = "Public URL of the backend"
}
output "grafana_url" {
  value       = "https://${local.grafana_custom_domain}"
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
  value       = "https://${local.backend_custom_domain}/auth/google/callback"
  description = "Google OAuth2 redirect URI — register this in your Google Cloud Console"
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
output "dns_txt_records" {
  sensitive = true
  value = {
    "asuid.egzaminmaklerski.online"            = module.frontend.custom_domain_verification_id
    "asuid.api.egzaminmaklerski.online"        = module.backend.custom_domain_verification_id
    "asuid.monitoring.egzaminmaklerski.online" = module.grafana.custom_domain_verification_id
  }
  description = "Add these TXT records in your DNS provider, then run terraform apply again to bind custom domains"
}
