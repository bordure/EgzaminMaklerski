apiVersion: 1

datasources:
  - name: Prometheus
    uid: prometheus
    orgId: 1
    type: prometheus
    access: proxy
    url: "${prometheus_url}"
    isDefault: true
    editable: false
    jsonData:
      httpMethod: GET
      timeInterval: 15s
      manageAlerts: false
