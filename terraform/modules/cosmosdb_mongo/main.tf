resource "azurerm_cosmosdb_account" "this" {
  name                = var.name
  location            = var.location
  resource_group_name = var.resource_group_name
  offer_type          = "Standard"
  kind                = "MongoDB"
  free_tier_enabled   = var.enable_free_tier
  mongo_server_version = "7.0"
  tags                = var.tags
  is_virtual_network_filter_enabled = length(var.allowed_cidrs) > 0 ? true : false
  ip_range_filter                   = var.allowed_cidrs
  capabilities {
    name = "EnableMongo"
  }
  dynamic "capabilities" {
    for_each = var.serverless ? ["enabled"] : []
    content {
      name = "EnableServerless"
    }
  }
  consistency_policy {
    consistency_level = "Session"
  }
  geo_location {
    location          = var.location
    failover_priority = 0
  }
  lifecycle {
    prevent_destroy = false
  }
}
resource "azurerm_cosmosdb_mongo_database" "this" {
  name                = var.database_name
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.this.name
  throughput = var.serverless ? null : 400
}
