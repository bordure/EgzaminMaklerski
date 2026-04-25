resource "azurerm_cognitive_account" "this" {
  name                  = var.name
  location              = var.location
  resource_group_name   = var.resource_group_name
  kind                  = "OpenAI"
  sku_name              = "S0"
  custom_subdomain_name = var.name
  tags                  = var.tags
}
resource "azurerm_cognitive_deployment" "this" {
  name                 = var.deployment_name
  cognitive_account_id = azurerm_cognitive_account.this.id
  model {
    format  = "OpenAI"
    name    = var.deployment_name
    version = var.model_version
  }
  sku {
    name     = "GlobalStandard"
    capacity = var.deployment_capacity
  }
}
