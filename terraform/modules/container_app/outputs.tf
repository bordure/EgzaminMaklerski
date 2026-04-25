output "id" {
  value       = azurerm_container_app.this.id
  description = "Resource ID of the Container App"
}
output "name" {
  value       = azurerm_container_app.this.name
  description = "Name of the Container App"
}
output "fqdn" {
  value       = try(azurerm_container_app.this.ingress[0].fqdn, "")
  description = "Fully qualified domain name of the Container App"
}
