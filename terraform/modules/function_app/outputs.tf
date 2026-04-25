output "function_app_name" {
  value       = azurerm_linux_function_app.this.name
  description = "Name of the Azure Function App"
}
output "function_app_hostname" {
  value       = azurerm_linux_function_app.this.default_hostname
  description = "Default hostname of the function app (e.g. <name>.azurewebsites.net)"
}
output "blob_to_mongo_url" {
  value       = "https://${azurerm_linux_function_app.this.default_hostname}/api/blob_to_mongo"
  description = "URL for the blob_to_mongo function. Authenticate with x-functions-key header or ?code= query param."
}
output "learning_advisor_url" {
  value       = "https://${azurerm_linux_function_app.this.default_hostname}/api/learning_advisor"
  description = "URL for the learning_advisor function. Authenticate with x-functions-key header or ?code= query param."
}
output "default_key" {
  value       = azurerm_linux_function_app.this.site_credential[0].password
  sensitive   = true
  description = "Default function key used to authenticate requests when auth_level = FUNCTION."
}
