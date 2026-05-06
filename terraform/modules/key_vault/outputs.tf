output "id" {
  value       = azurerm_key_vault.this.id
  description = "Resource ID of the Key Vault"
}
output "name" {
  value       = azurerm_key_vault.this.name
  description = "Key Vault name"
}
output "vault_uri" {
  value       = azurerm_key_vault.this.vault_uri
  description = "URI of the Key Vault (e.g. https://my-vault.vault.azure.net/)"
}
output "secret_ids" {
  value       = { for k, s in azurerm_key_vault_secret.this : k => s.id }
  description = "Map of secret name -> Key Vault secret resource ID"
  sensitive   = true
}
