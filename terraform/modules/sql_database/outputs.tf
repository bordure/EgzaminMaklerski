output "server_id" {
  value       = azurerm_mssql_server.this.id
  description = "Resource ID of the SQL Server."
}
output "server_name" {
  value       = azurerm_mssql_server.this.name
  description = "SQL Server name."
}
output "server_fqdn" {
  value       = azurerm_mssql_server.this.fully_qualified_domain_name
  description = "Fully qualified domain name of the SQL Server."
}
