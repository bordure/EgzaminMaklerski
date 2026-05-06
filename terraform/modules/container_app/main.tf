resource "azurerm_container_app" "this" {
  name                         = var.name
  resource_group_name          = var.resource_group_name
  container_app_environment_id = var.container_app_environment_id
  revision_mode                = "Single"
  tags                         = var.tags
  dynamic "secret" {
    for_each = var.secrets
    content {
      name  = secret.value.name
      value = secret.value.value
    }
  }
  template {
    min_replicas = var.min_replicas
    max_replicas = var.max_replicas
    dynamic "volume" {
      for_each = var.volumes
      content {
        name         = volume.value.name
        storage_type = volume.value.storage_type
        storage_name = volume.value.storage_name
      }
    }
    container {
      name   = var.name
      image  = var.image
      cpu    = var.cpu
      memory = var.memory
      dynamic "env" {
        for_each = var.env_vars
        content {
          name        = env.value.name
          value       = env.value.value
          secret_name = env.value.secret_name
        }
      }
      dynamic "volume_mounts" {
        for_each = var.volume_mounts
        content {
          name = volume_mounts.value.name
          path = volume_mounts.value.path
        }
      }
      dynamic "startup_probe" {
        for_each = var.startup_probe_path != null ? [1] : []
        content {
          transport        = "HTTP"
          port             = var.target_port
          path             = var.startup_probe_path
          initial_delay    = 5
          interval_seconds = 10
          timeout          = 5
          failure_count_threshold = 10
        }
      }
    }
  }
  ingress {
    target_port      = var.target_port
    external_enabled = var.external_ingress
    transport        = "http"
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }
}
resource "azurerm_container_app_custom_domain" "this" {
  for_each = toset(var.custom_domain_names)
  name             = each.value
  container_app_id = azurerm_container_app.this.id
  certificate_binding_type = "Disabled"
  lifecycle {
    ignore_changes = [
      container_app_environment_certificate_id,
      certificate_binding_type,
    ]
  }
}
