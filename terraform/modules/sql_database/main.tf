resource "azurerm_mssql_server" "this" {
  name                         = var.server_name
  resource_group_name          = var.resource_group_name
  location                     = var.location
  version                      = "12.0"
  administrator_login          = var.administrator_login
  administrator_login_password = var.administrator_password
  minimum_tls_version          = "1.2"
  tags                         = var.tags
}
resource "azurerm_mssql_firewall_rule" "allowed_ips" {
  for_each         = toset(var.allowed_ips)
  name             = "AllowIP-${replace(each.value, ".", "-")}"
  server_id        = azurerm_mssql_server.this.id
  start_ip_address = each.value
  end_ip_address   = each.value
}
resource "azurerm_mssql_firewall_rule" "azure_services" {
  count            = var.allow_azure_services ? 1 : 0
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.this.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}
