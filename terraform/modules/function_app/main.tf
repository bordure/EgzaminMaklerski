data "archive_file" "app" {
  type        = "zip"
  source_dir  = var.functions_dir
  output_path = "${path.root}/.terraform/functions-${var.name}.zip"
  excludes    = ["local.settings.json", "local.settings.json.example", "Dockerfile", "seed_local_blobs.py"]
}
resource "azurerm_service_plan" "this" {
  name                = "${var.name}-plan"
  location            = var.location
  resource_group_name = var.resource_group_name
  os_type             = "Linux"
  sku_name            = var.sku_name
  tags                = var.tags
}
resource "azurerm_linux_function_app" "this" {
  name                       = var.name
  location                   = var.location
  resource_group_name        = var.resource_group_name
  service_plan_id            = azurerm_service_plan.this.id
  storage_account_name       = var.storage_account_name
  storage_account_access_key = var.storage_account_access_key
  zip_deploy_file            = data.archive_file.app.output_path
  tags                       = var.tags
  site_config {
    application_stack {
      python_version = "3.11"
    }
  }
  app_settings = merge(
    {
      "FUNCTIONS_WORKER_RUNTIME"    = "python"
      "FUNCTIONS_EXTENSION_VERSION" = "~4"
      "SCM_DO_BUILD_DURING_DEPLOYMENT" = "true"
    },
    var.app_settings,
  )
}
