output "id" {
  value       = azurerm_cognitive_account.this.id
  description = "Resource ID of the Azure OpenAI account"
}
output "endpoint" {
  value       = azurerm_cognitive_account.this.endpoint
  description = "Azure OpenAI endpoint URL (set as AZURE_OPENAI_ENDPOINT)"
}
output "api_key" {
  value       = azurerm_cognitive_account.this.primary_access_key
  sensitive   = true
  description = "Primary API key (set as AZURE_OPENAI_API_KEY)"
}
output "deployment_name" {
  value       = azurerm_cognitive_deployment.this.name
  description = "Name of the deployed model (set as AZURE_OPENAI_DEPLOYMENT)"
}
