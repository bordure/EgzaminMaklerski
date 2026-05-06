resource "azurerm_storage_account" "this" {
  name                            = var.name
  resource_group_name             = var.resource_group_name
  location                        = var.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  min_tls_version                 = "TLS1_2"
  https_traffic_only_enabled      = true
  allow_nested_items_to_be_public = false
  tags = var.tags
}
resource "azurerm_storage_container" "blobs" {
  count                 = var.blob_container_name != "" ? 1 : 0
  name                  = var.blob_container_name
  storage_account_id    = azurerm_storage_account.this.id
  container_access_type = "private"
}
resource "azurerm_storage_blob" "uploads" {
  for_each = var.blob_container_name != "" ? var.blob_uploads : {}
  name                   = each.key
  storage_account_name   = azurerm_storage_account.this.name
  storage_container_name = azurerm_storage_container.blobs[0].name
  type                   = "Block"
  source                 = each.value.source
  content_type           = each.value.content_type
  depends_on = [azurerm_storage_container.blobs]
}
