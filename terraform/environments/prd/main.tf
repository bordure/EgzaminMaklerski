terraform {
  required_version = ">= 1.7.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
  backend "azurerm" {}
}
provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}
data "azurerm_client_config" "current" {}
locals {
  prefix = "${var.project}-prd"
  backend_fqdn  = "${local.prefix}-backend.${azurerm_container_app_environment.this.default_domain}"
  frontend_fqdn = "${local.prefix}-frontend.${azurerm_container_app_environment.this.default_domain}"
  prometheus_url = "http://${local.prefix}-prometheus.internal.${azurerm_container_app_environment.this.default_domain}"
  sql_database_url = "mssql+pymssql://${urlencode(var.sql_admin_login)}:${urlencode(var.sql_admin_password)}@${module.sql.server_fqdn}/appdb"
  tags = {
    environment = "prd"
    project     = var.project
    managed_by  = "terraform"
  }
}
resource "azurerm_resource_group" "this" {
  name     = "${local.prefix}-rg"
  location = var.location
  tags     = local.tags
}
resource "azurerm_container_app_environment" "this" {
  name                = "${local.prefix}-cae"
  location            = var.location
  resource_group_name = azurerm_resource_group.this.name
  tags                = local.tags
}
module "storage" {
  source              = "../../modules/storage_account"
  name                = var.storage_account_name
  resource_group_name = azurerm_resource_group.this.name
  location            = var.location
  tags                = local.tags
  blob_container_name = "exam-data"
  blob_uploads = {
    "output09.10.2022.json" = { source = "${path.module}/../../../scrapper/data/output09.10.2022.json" }
    "output12.10.2025.json" = { source = "${path.module}/../../../scrapper/data/output12.10.2025.json" }
    "output13.10.2024.json" = { source = "${path.module}/../../../scrapper/data/output13.10.2024.json" }
    "output15.10.2023.json" = { source = "${path.module}/../../../scrapper/data/output15.10.2023.json" }
    "output17.03.2024.json" = { source = "${path.module}/../../../scrapper/data/output17.03.2024.json" }
    "output19.03.2023.json" = { source = "${path.module}/../../../scrapper/data/output19.03.2023.json" }
    "output27.03.2022.json" = { source = "${path.module}/../../../scrapper/data/output27.03.2022.json" }
    "output30.03.2025.json" = { source = "${path.module}/../../../scrapper/data/output30.03.2025.json" }
  }
}
module "key_vault" {
  source              = "../../modules/key_vault"
  name                = "${var.project}-prd-kv"
  resource_group_name = azurerm_resource_group.this.name
  location            = var.location
  tenant_id           = data.azurerm_client_config.current.tenant_id
  terraform_object_id = data.azurerm_client_config.current.object_id
  secrets             = var.secrets
  tags                = local.tags
}
module "cosmosdb" {
  source              = "../../modules/cosmosdb_mongo"
  name                = "${local.prefix}-cosmos"
  resource_group_name = azurerm_resource_group.this.name
  location            = var.location
  enable_free_tier    = false
  serverless          = true
  database_name       = var.database_name
  tags                = local.tags
}
module "openai" {
  source              = "../../modules/openai"
  name                = "${var.project}-prd-ai"
  resource_group_name = azurerm_resource_group.this.name
  location            = var.openai_location
  deployment_name     = var.openai_deployment
  tags                = local.tags
}
module "sql" {
  source                 = "../../modules/sql_database"
  server_name            = "${local.prefix}-sql"
  resource_group_name    = azurerm_resource_group.this.name
  location               = var.location
  administrator_login    = var.sql_admin_login
  administrator_password = var.sql_admin_password
  tags                   = local.tags
}
resource "azurerm_storage_share" "grafana_provisioning" {
  name               = "grafana-provisioning"
  storage_account_id = module.storage.id
  quota              = 1
}
resource "azurerm_storage_share" "grafana_dashboards" {
  name               = "grafana-dashboards"
  storage_account_id = module.storage.id
  quota              = 1
}
resource "azurerm_storage_share_directory" "dashboards_dir" {
  name              = "dashboards"
  storage_share_url = azurerm_storage_share.grafana_provisioning.url
}
resource "azurerm_storage_share_directory" "datasources_dir" {
  name              = "datasources"
  storage_share_url = azurerm_storage_share.grafana_provisioning.url
}
resource "azurerm_storage_share_file" "dashboard_yml" {
  name              = "dashboard.yml"
  path              = "dashboards"
  storage_share_url = azurerm_storage_share.grafana_provisioning.url
  source            = "${path.module}/../../../monitoring/grafana/provisioning/dashboards/dashboard.yml"
  depends_on        = [azurerm_storage_share_directory.dashboards_dir]
}
resource "local_file" "grafana_datasource" {
  filename = "${path.root}/.terraform/grafana-datasource.yml"
  content  = templatefile("${path.module}/../../../monitoring/grafana-datasource.azure.yml.tpl", {
    prometheus_url = local.prometheus_url
  })
}
resource "azurerm_storage_share_file" "prometheus_yml" {
  name              = "prometheus.yml"
  path              = "datasources"
  storage_share_url = azurerm_storage_share.grafana_provisioning.url
  source            = local_file.grafana_datasource.filename
  depends_on        = [azurerm_storage_share_directory.datasources_dir, local_file.grafana_datasource]
}
resource "azurerm_storage_share" "prometheus_config" {
  name               = "prometheus-config"
  storage_account_id = module.storage.id
  quota              = 1
}
resource "local_file" "prometheus_scrape_config" {
  filename = "${path.root}/.terraform/prometheus.yml"
  content  = templatefile("${path.module}/../../../monitoring/prometheus.azure.yml.tpl", {
    backend_internal_host = "${local.prefix}-backend.internal.${azurerm_container_app_environment.this.default_domain}"
  })
}
resource "azurerm_storage_share_file" "prometheus_config_yml" {
  name              = "prometheus.yml"
  storage_share_url = azurerm_storage_share.prometheus_config.url
  source            = local_file.prometheus_scrape_config.filename
  depends_on        = [local_file.prometheus_scrape_config]
}
resource "azurerm_storage_share_file" "egzamin_json" {
  name              = "egzamin.json"
  storage_share_url = azurerm_storage_share.grafana_dashboards.url
  source            = "${path.module}/../../../monitoring/grafana/dashboards/egzamin.json"
}
resource "azurerm_container_app_environment_storage" "grafana_provisioning" {
  name                         = "grafana-provisioning"
  container_app_environment_id = azurerm_container_app_environment.this.id
  account_name                 = module.storage.name
  access_key                   = module.storage.primary_access_key
  share_name                   = azurerm_storage_share.grafana_provisioning.name
  access_mode                  = "ReadOnly"
}
resource "azurerm_container_app_environment_storage" "grafana_dashboards" {
  name                         = "grafana-dashboards"
  container_app_environment_id = azurerm_container_app_environment.this.id
  account_name                 = module.storage.name
  access_key                   = module.storage.primary_access_key
  share_name                   = azurerm_storage_share.grafana_dashboards.name
  access_mode                  = "ReadOnly"
}
resource "azurerm_container_app_environment_storage" "prometheus_config" {
  name                         = "prometheus-config"
  container_app_environment_id = azurerm_container_app_environment.this.id
  account_name                 = module.storage.name
  access_key                   = module.storage.primary_access_key
  share_name                   = azurerm_storage_share.prometheus_config.name
  access_mode                  = "ReadOnly"
}
module "backend" {
  source                       = "../../modules/container_app"
  name                         = "${local.prefix}-backend"
  resource_group_name          = azurerm_resource_group.this.name
  container_app_environment_id = azurerm_container_app_environment.this.id
  image                        = var.backend_image
  cpu                          = 0.5
  memory                       = "1Gi"
  min_replicas                 = 1
  max_replicas                 = 3
  target_port                  = 8000
  external_ingress             = true
  startup_probe_path           = "/health"
  secrets = [
    { name = "mongo-uri",            value = module.cosmosdb.connection_string },
    { name = "google-client-secret", value = var.secrets["google-client-secret"] },
    { name = "jwt-secret-key",       value = var.secrets["jwt-secret-key"] },
    { name = "azure-openai-key",     value = module.openai.api_key },
    { name = "blob-to-mongo-url",    value = module.functions.blob_to_mongo_url },
    { name = "learning-advisor-url", value = module.functions.learning_advisor_url },
    { name = "sql-database-url",     value = local.sql_database_url },
  ]
  env_vars = [
    { name = "MONGO_URI",               secret_name = "mongo-uri" },
    { name = "AZURE_OPENAI_ENDPOINT",   value = module.openai.endpoint },
    { name = "AZURE_OPENAI_API_KEY",    secret_name = "azure-openai-key" },
    { name = "GOOGLE_CLIENT_ID",        value = var.google_client_id },
    { name = "GOOGLE_CLIENT_SECRET",    secret_name = "google-client-secret" },
    { name = "JWT_SECRET_KEY",          secret_name = "jwt-secret-key" },
    { name = "FRONTEND_URL",            value = "https://${local.frontend_fqdn}" },
    { name = "GOOGLE_REDIRECT_URI",     value = "https://${local.backend_fqdn}/auth/google/callback" },
    { name = "BLOB_TO_MONGO_URL",       secret_name = "blob-to-mongo-url" },
    { name = "LEARNING_ADVISOR_URL",    secret_name = "learning-advisor-url" },
    { name = "SQL_DATABASE_URL",        secret_name = "sql-database-url" },
  ]
  tags = local.tags
}
module "frontend" {
  source                       = "../../modules/container_app"
  name                         = "${local.prefix}-frontend"
  resource_group_name          = azurerm_resource_group.this.name
  container_app_environment_id = azurerm_container_app_environment.this.id
  image                        = var.frontend_image
  cpu                          = 0.5
  memory                       = "1Gi"
  min_replicas                 = 1
  max_replicas                 = 3
  target_port                  = 80
  external_ingress             = true
  env_vars = [
    { name = "VITE_API_URL", value = "https://${local.backend_fqdn}" },
  ]
  tags = local.tags
}
module "grafana" {
  source                       = "../../modules/container_app"
  name                         = "${local.prefix}-grafana"
  resource_group_name          = azurerm_resource_group.this.name
  container_app_environment_id = azurerm_container_app_environment.this.id
  image                        = "grafana/grafana:latest"
  cpu                          = 0.25
  memory                       = "0.5Gi"
  min_replicas                 = 0
  max_replicas                 = 1
  target_port                  = 3000
  external_ingress             = true
  secrets = [
    { name = "grafana-admin-password", value = var.secrets["grafana-admin-password"] },
  ]
  env_vars = [
    { name = "GF_SECURITY_ADMIN_PASSWORD",          secret_name = "grafana-admin-password" },
    { name = "GF_USERS_ALLOW_SIGN_UP",              value = "false" },
    { name = "GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH", value = "/var/lib/grafana/dashboards/egzamin.json" },
  ]
  volumes = [
    { name = "grafana-provisioning", storage_type = "AzureFile", storage_name = azurerm_container_app_environment_storage.grafana_provisioning.name },
    { name = "grafana-dashboards",   storage_type = "AzureFile", storage_name = azurerm_container_app_environment_storage.grafana_dashboards.name },
  ]
  volume_mounts = [
    { name = "grafana-provisioning", path = "/etc/grafana/provisioning" },
    { name = "grafana-dashboards",   path = "/var/lib/grafana/dashboards" },
  ]
  tags = local.tags
}
module "prometheus" {
  source                       = "../../modules/container_app"
  name                         = "${local.prefix}-prometheus"
  resource_group_name          = azurerm_resource_group.this.name
  container_app_environment_id = azurerm_container_app_environment.this.id
  image                        = "prom/prometheus:latest"
  cpu                          = 0.25
  memory                       = "0.5Gi"
  min_replicas                 = 0
  max_replicas                 = 1
  target_port                  = 9090
  external_ingress             = false
  volumes = [
    { name = "prometheus-config", storage_type = "AzureFile", storage_name = azurerm_container_app_environment_storage.prometheus_config.name },
  ]
  volume_mounts = [
    { name = "prometheus-config", path = "/etc/prometheus" },
  ]
  tags = local.tags
  depends_on = [azurerm_storage_share_file.prometheus_config_yml]
}
module "functions" {
  source = "../../modules/function_app"
  name                       = "${local.prefix}-func"
  resource_group_name        = azurerm_resource_group.this.name
  location                   = var.location
  storage_account_name       = module.storage.name
  storage_account_access_key = module.storage.primary_access_key
  functions_dir              = "${path.module}/../../../functions"
  sku_name                   = "EP1"
  tags                       = local.tags
  app_settings = {
    AZURE_STORAGE_CONNECTION_STRING = module.storage.primary_connection_string
    BLOB_CONTAINER_NAME             = "exam-data"
    MONGO_URI                       = module.cosmosdb.connection_string
    MONGO_DB_NAME                   = var.database_name
    MONGO_COLLECTION_NAME           = "questions"
    SQL_DATABASE_URL                = local.sql_database_url
    AZURE_OPENAI_ENDPOINT           = module.openai.endpoint
    AZURE_OPENAI_API_KEY            = module.openai.api_key
    AZURE_OPENAI_DEPLOYMENT         = module.openai.deployment_name
  }
}
