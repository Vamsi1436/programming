"""
Models for Blacknight Internet Solutions Ltd. - Object structures
These are not database models, but rather represent the data structure
for the JSON storage used in this application.
"""
from datetime import datetime

# Client schema
CLIENT_SCHEMA = {
    'id': str,  # UUID
    'client_id': str,  # BK0001
    'first_name': str,
    'last_name': str,
    'email': str,
    'phone': str,
    'company_name': str,
    'address': str,
    'city': str,
    'country': str,  # Default: "Ireland"
    'date_registered': str,  # ISO format: YYYY-MM-DD
    'status': str,  # Active, Inactive, Suspended
    'notes': str
}

# Service schema
SERVICE_SCHEMA = {
    'id': str,  # UUID
    'service_id': str,  # SRV001
    'name': str,
    'description': str,
    'category': str,  # Web Hosting, VPS, Dedicated Server, Domain Registration, etc.
    'price': float,
    'billing_cycle': str,  # Monthly, Quarterly, Annually
    'features': str,  # JSON string
    'is_active': bool  # True/False
}

# Subscription schema
SUBSCRIPTION_SCHEMA = {
    'id': str,  # UUID
    'subscription_id': str,  # SUB00001
    'client_id': str,  # UUID reference to client
    'service_id': str,  # UUID reference to service
    'start_date': str,  # ISO format: YYYY-MM-DD
    'end_date': str,  # ISO format: YYYY-MM-DD, can be null
    'status': str,  # Active, Expired, Cancelled, Suspended
    'amount': float,
    'billing_cycle': str,  # Monthly, Quarterly, Annually
    'auto_renew': bool,
    'notes': str
}