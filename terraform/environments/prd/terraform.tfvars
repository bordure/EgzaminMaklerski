# ============================================================
# Prod environment — terraform.tfvars
# ============================================================
# SENSITIVE VALUES: do NOT put secrets here.
# Pass secrets via: terraform apply -var-file=../../secrets.tfvars
# ============================================================

subscription_id = "00000000-0000-0000-0000-000000000000"  # replace
location        = "Germany West Central"
openai_location = "Sweden Central"
project         = "egzamin-maklerski"
database_name   = "exam_db"

# Storage account name: 3-24 lowercase alphanumeric, globally unique, no hyphens
storage_account_name = "egzaminprdst01"  # replace with a unique name

# SQL Server admin (non-sensitive login name only; password goes in secrets.tfvars)
sql_admin_login = "sqladmin"

# Container images — production tags
backend_image  = "REPLACE_WITH_REGISTRY/backend:latest"
frontend_image = "REPLACE_WITH_REGISTRY/frontend:latest"

openai_deployment = "gpt-4.1-nano"

# Google OAuth2 (non-sensitive part)
google_client_id = "REPLACE_WITH_GOOGLE_CLIENT_ID"

