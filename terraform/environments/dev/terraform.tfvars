# ============================================================
# Dev environment — terraform.tfvars
# ============================================================
# SENSITIVE VALUES: do NOT put secrets here.
# Pass secrets via: terraform apply -var-file=../../secrets.tfvars
# ============================================================

subscription_id = "368ced15-3f4a-4e61-842f-06d2ad888577"
location        = "Germany West Central"
openai_location = "Germany West Central"
project         = "egzamin-maklerski"
database_name   = "exam_db"

# Storage account name: 3-24 lowercase alphanumeric, globally unique, no hyphens
storage_account_name = "egzamindevst01"  # replace with a unique name

# SQL Server admin (non-sensitive login name only; password goes in secrets.tfvars)
sql_admin_login = "sqladmin"

# Container images
backend_image  = "dihake/egzamin-maklerski-backend:0.07"
frontend_image = "dihake/egzamin-maklerski-frontend:0.06"

openai_deployment = "gpt-4.1-nano"

# google_client_id moved to secrets.tfvars (google-client-id key)

