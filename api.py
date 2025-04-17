import json
import os
import uuid
import logging
from datetime import datetime
from flask import jsonify, request, abort
from app import app

# Ensure data directory exists
os.makedirs('data', exist_ok=True)

# Initialize data files if they don't exist
def init_data_file(file_path, initial_data=None):
    if not os.path.exists(file_path):
        with open(file_path, 'w') as f:
            json.dump(initial_data or [], f)

# Initialize all data files
init_data_file('data/clients.json')
init_data_file('data/services.json')
init_data_file('data/subscriptions.json')

# Helper functions for data operations
def read_data(file_path):
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError) as e:
        logging.error(f"Error reading data file {file_path}: {e}")
        return []

def write_data(file_path, data):
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

# API Routes for Clients
@app.route('/api/clients', methods=['GET'])
def get_clients():
    search_query = request.args.get('search', '').lower()
    sort_by = request.args.get('sort_by', 'last_name')
    sort_order = request.args.get('sort_order', 'asc')
    
    clients = read_data('data/clients.json')
    
    # Filter by search query if provided
    if search_query:
        clients = [
            c for c in clients 
            if search_query in c.get('first_name', '').lower() or 
               search_query in c.get('last_name', '').lower() or
               search_query in c.get('email', '').lower() or
               search_query in c.get('company_name', '').lower() or
               search_query in c.get('client_id', '').lower()
        ]
    
    # Sort the results
    reverse = sort_order.lower() == 'desc'
    clients = sorted(clients, key=lambda x: x.get(sort_by, ''), reverse=reverse)
    
    return jsonify(clients)

@app.route('/api/clients/<client_id>', methods=['GET'])
def get_client(client_id):
    clients = read_data('data/clients.json')
    client = next((c for c in clients if c.get('client_id') == client_id), None)
    if client:
        return jsonify(client)
    return abort(404, description="Client not found")

@app.route('/api/clients', methods=['POST'])
def create_client():
    data = request.get_json()
    if not data:
        return abort(400, description="No data provided")
    
    required_fields = ['first_name', 'last_name', 'email', 'phone']
    for field in required_fields:
        if field not in data:
            return abort(400, description=f"Missing required field: {field}")
    
    clients = read_data('data/clients.json')
    
    # Check for duplicate email
    if any(c.get('email') == data['email'] for c in clients):
        return abort(400, description="Email already exists")
    
    # Generate a unique ID
    new_id = str(uuid.uuid4())
    
    # Create a client ID based on name
    client_id = f"BK{len(clients) + 1:04d}"
    
    # Create the new client record
    new_client = {
        'id': new_id,
        'client_id': client_id,
        'first_name': data['first_name'],
        'last_name': data['last_name'],
        'email': data['email'],
        'phone': data['phone'],
        'company_name': data.get('company_name', ''),
        'address': data.get('address', ''),
        'city': data.get('city', ''),
        'country': data.get('country', 'Ireland'),
        'date_registered': datetime.now().strftime('%Y-%m-%d'),
        'status': data.get('status', 'Active'),
        'notes': data.get('notes', '')
    }
    
    clients.append(new_client)
    write_data('data/clients.json', clients)
    
    return jsonify(new_client), 201

@app.route('/api/clients/<client_id>', methods=['PUT'])
def update_client(client_id):
    data = request.get_json()
    if not data:
        return abort(400, description="No data provided")
    
    clients = read_data('data/clients.json')
    client_index = next((i for i, c in enumerate(clients) if c.get('client_id') == client_id), None)
    
    if client_index is None:
        return abort(404, description="Client not found")
    
    # Check for duplicate email with other clients
    if data.get('email') and any(c.get('email') == data['email'] and c.get('client_id') != client_id for c in clients):
        return abort(400, description="Email already exists for another client")
    
    # Update the client
    current_client = clients[client_index]
    for key, value in data.items():
        if key != 'client_id':  # Don't allow changing client_id
            current_client[key] = value
    
    write_data('data/clients.json', clients)
    return jsonify(current_client)

@app.route('/api/clients/<client_id>', methods=['DELETE'])
def delete_client(client_id):
    clients = read_data('data/clients.json')
    subscriptions = read_data('data/subscriptions.json')
    
    # Find the client
    client_index = next((i for i, c in enumerate(clients) if c.get('client_id') == client_id), None)
    if client_index is None:
        return abort(404, description="Client not found")
    
    # Check if client has subscriptions
    if any(s.get('client_id') == client_id for s in subscriptions):
        return abort(400, description="Cannot delete client with active subscriptions")
    
    # Remove the client
    deleted_client = clients.pop(client_index)
    write_data('data/clients.json', clients)
    
    return jsonify({"message": f"Client {deleted_client.get('first_name')} {deleted_client.get('last_name')} deleted successfully"})

# API Routes for Services
@app.route('/api/services', methods=['GET'])
def get_services():
    search_query = request.args.get('search', '').lower()
    sort_by = request.args.get('sort_by', 'name')
    sort_order = request.args.get('sort_order', 'asc')
    
    services = read_data('data/services.json')
    
    # Filter by search query if provided
    if search_query:
        services = [
            s for s in services 
            if search_query in s.get('name', '').lower() or 
               search_query in s.get('service_id', '').lower() or
               search_query in s.get('category', '').lower() or
               search_query in s.get('description', '').lower()
        ]
    
    # Sort the results
    reverse = sort_order.lower() == 'desc'
    services = sorted(services, key=lambda x: x.get(sort_by, ''), reverse=reverse)
    
    return jsonify(services)

@app.route('/api/services/<service_id>', methods=['GET'])
def get_service(service_id):
    services = read_data('data/services.json')
    service = next((s for s in services if s.get('service_id') == service_id), None)
    if service:
        return jsonify(service)
    return abort(404, description="Service not found")

@app.route('/api/services', methods=['POST'])
def create_service():
    data = request.get_json()
    if not data:
        return abort(400, description="No data provided")
    
    required_fields = ['name', 'price', 'category']
    for field in required_fields:
        if field not in data:
            return abort(400, description=f"Missing required field: {field}")
    
    services = read_data('data/services.json')
    
    # Generate a unique ID
    new_id = str(uuid.uuid4())
    
    # Create a service ID
    service_id = f"SRV{len(services) + 1:03d}"
    
    # Create the new service record
    new_service = {
        'id': new_id,
        'service_id': service_id,
        'name': data['name'],
        'description': data.get('description', ''),
        'category': data['category'],
        'price': float(data['price']),
        'billing_cycle': data.get('billing_cycle', 'Monthly'),
        'features': data.get('features', ''),
        'is_active': data.get('is_active', True)
    }
    
    services.append(new_service)
    write_data('data/services.json', services)
    
    return jsonify(new_service), 201

@app.route('/api/services/<service_id>', methods=['PUT'])
def update_service(service_id):
    data = request.get_json()
    if not data:
        return abort(400, description="No data provided")
    
    services = read_data('data/services.json')
    service_index = next((i for i, s in enumerate(services) if s.get('service_id') == service_id), None)
    
    if service_index is None:
        return abort(404, description="Service not found")
    
    # Update the service
    current_service = services[service_index]
    for key, value in data.items():
        if key != 'service_id':  # Don't allow changing service_id
            if key == 'price':
                current_service[key] = float(value)
            else:
                current_service[key] = value
    
    write_data('data/services.json', services)
    return jsonify(current_service)

@app.route('/api/services/<service_id>', methods=['DELETE'])
def delete_service(service_id):
    services = read_data('data/services.json')
    subscriptions = read_data('data/subscriptions.json')
    
    # Find the service
    service_index = next((i for i, s in enumerate(services) if s.get('service_id') == service_id), None)
    if service_index is None:
        return abort(404, description="Service not found")
    
    # Check if service has subscriptions
    if any(s.get('service_id') == service_id for s in subscriptions):
        return abort(400, description="Cannot delete service with active subscriptions")
    
    # Remove the service
    deleted_service = services.pop(service_index)
    write_data('data/services.json', services)
    
    return jsonify({"message": f"Service {deleted_service.get('name')} deleted successfully"})

# API Routes for Subscriptions
@app.route('/api/subscriptions', methods=['GET'])
def get_subscriptions():
    search_query = request.args.get('search', '').lower()
    sort_by = request.args.get('sort_by', 'start_date')
    sort_order = request.args.get('sort_order', 'desc')
    
    subscriptions = read_data('data/subscriptions.json')
    clients = read_data('data/clients.json')
    services = read_data('data/services.json')
    
    # Enrich subscriptions with client and service data
    for subscription in subscriptions:
        client = next((c for c in clients if c.get('client_id') == subscription.get('client_id')), None)
        service = next((s for s in services if s.get('service_id') == subscription.get('service_id')), None)
        
        if client:
            subscription['client_name'] = f"{client.get('first_name')} {client.get('last_name')}"
            subscription['client_email'] = client.get('email')
            subscription['company_name'] = client.get('company_name', '')
        else:
            subscription['client_name'] = "Unknown Client"
            subscription['client_email'] = ""
            subscription['company_name'] = ""
            
        if service:
            subscription['service_name'] = service.get('name')
            subscription['service_category'] = service.get('category')
            subscription['billing_cycle'] = service.get('billing_cycle')
        else:
            subscription['service_name'] = "Unknown Service"
            subscription['service_category'] = ""
            subscription['billing_cycle'] = ""
    
    # Filter by search query if provided
    if search_query:
        subscriptions = [
            s for s in subscriptions 
            if search_query in s.get('client_name', '').lower() or 
               search_query in s.get('service_name', '').lower() or
               search_query in s.get('status', '').lower() or
               search_query in s.get('company_name', '').lower() or
               search_query in s.get('subscription_id', '').lower()
        ]
    
    # Sort the results
    reverse = sort_order.lower() == 'desc'
    subscriptions = sorted(subscriptions, key=lambda x: x.get(sort_by, ''), reverse=reverse)
    
    return jsonify(subscriptions)

@app.route('/api/subscriptions/<subscription_id>', methods=['GET'])
def get_subscription(subscription_id):
    subscriptions = read_data('data/subscriptions.json')
    subscription = next((s for s in subscriptions if s.get('subscription_id') == subscription_id), None)
    
    if not subscription:
        return abort(404, description="Subscription not found")
    
    # Enrich with client and service data
    clients = read_data('data/clients.json')
    services = read_data('data/services.json')
    
    client = next((c for c in clients if c.get('client_id') == subscription.get('client_id')), None)
    service = next((s for s in services if s.get('service_id') == subscription.get('service_id')), None)
    
    if client:
        subscription['client_name'] = f"{client.get('first_name')} {client.get('last_name')}"
        subscription['client_email'] = client.get('email')
        subscription['company_name'] = client.get('company_name', '')
    else:
        subscription['client_name'] = "Unknown Client"
        subscription['client_email'] = ""
        subscription['company_name'] = ""
        
    if service:
        subscription['service_name'] = service.get('name')
        subscription['service_category'] = service.get('category')
    else:
        subscription['service_name'] = "Unknown Service"
        subscription['service_category'] = ""
    
    return jsonify(subscription)

@app.route('/api/subscriptions', methods=['POST'])
def create_subscription():
    data = request.get_json()
    if not data:
        return abort(400, description="No data provided")
    
    required_fields = ['client_id', 'service_id', 'start_date']
    for field in required_fields:
        if field not in data:
            return abort(400, description=f"Missing required field: {field}")
    
    subscriptions = read_data('data/subscriptions.json')
    clients = read_data('data/clients.json')
    services = read_data('data/services.json')
    
    # Validate client_id and service_id
    client = next((c for c in clients if c.get('client_id') == data['client_id']), None)
    if not client:
        return abort(400, description="Client not found")
    
    service = next((s for s in services if s.get('service_id') == data['service_id']), None)
    if not service:
        return abort(400, description="Service not found")
    
    # Check if subscription already exists
    if any(s.get('client_id') == data['client_id'] and s.get('service_id') == data['service_id'] and s.get('status') == 'Active' for s in subscriptions):
        return abort(400, description="Client already has an active subscription for this service")
    
    # Generate a unique ID
    new_id = str(uuid.uuid4())
    
    # Create a subscription ID
    subscription_id = f"SUB{len(subscriptions) + 1:05d}"
    
    # Create the new subscription record
    new_subscription = {
        'id': new_id,
        'subscription_id': subscription_id,
        'client_id': data['client_id'],
        'service_id': data['service_id'],
        'start_date': data['start_date'],
        'end_date': data.get('end_date', None),
        'status': data.get('status', 'Active'),
        'amount': data.get('amount', service.get('price')),
        'billing_cycle': data.get('billing_cycle', service.get('billing_cycle', 'Monthly')),
        'auto_renew': data.get('auto_renew', True),
        'notes': data.get('notes', '')
    }
    
    subscriptions.append(new_subscription)
    write_data('data/subscriptions.json', subscriptions)
    
    # Enrich with client and service data for response
    new_subscription['client_name'] = f"{client.get('first_name')} {client.get('last_name')}"
    new_subscription['client_email'] = client.get('email')
    new_subscription['service_name'] = service.get('name')
    new_subscription['service_category'] = service.get('category')
    
    return jsonify(new_subscription), 201

@app.route('/api/subscriptions/<subscription_id>', methods=['PUT'])
def update_subscription(subscription_id):
    data = request.get_json()
    if not data:
        return abort(400, description="No data provided")
    
    subscriptions = read_data('data/subscriptions.json')
    subscription_index = next((i for i, s in enumerate(subscriptions) if s.get('subscription_id') == subscription_id), None)
    
    if subscription_index is None:
        return abort(404, description="Subscription not found")
    
    # Update the subscription
    current_subscription = subscriptions[subscription_index]
    for key, value in data.items():
        if key != 'subscription_id' and key != 'client_id' and key != 'service_id':  # Don't allow changing these
            current_subscription[key] = value
    
    write_data('data/subscriptions.json', subscriptions)
    
    # Enrich with client and service data for response
    clients = read_data('data/clients.json')
    services = read_data('data/services.json')
    
    client = next((c for c in clients if c.get('client_id') == current_subscription.get('client_id')), None)
    service = next((s for s in services if s.get('service_id') == current_subscription.get('service_id')), None)
    
    if client:
        current_subscription['client_name'] = f"{client.get('first_name')} {client.get('last_name')}"
        current_subscription['client_email'] = client.get('email')
    else:
        current_subscription['client_name'] = "Unknown Client"
        current_subscription['client_email'] = ""
        
    if service:
        current_subscription['service_name'] = service.get('name')
        current_subscription['service_category'] = service.get('category')
    else:
        current_subscription['service_name'] = "Unknown Service"
        current_subscription['service_category'] = ""
    
    return jsonify(current_subscription)

@app.route('/api/subscriptions/<subscription_id>', methods=['DELETE'])
def delete_subscription(subscription_id):
    subscriptions = read_data('data/subscriptions.json')
    
    # Find the subscription
    subscription_index = next((i for i, s in enumerate(subscriptions) if s.get('subscription_id') == subscription_id), None)
    if subscription_index is None:
        return abort(404, description="Subscription not found")
    
    # Remove the subscription
    deleted_subscription = subscriptions.pop(subscription_index)
    write_data('data/subscriptions.json', subscriptions)
    
    return jsonify({"message": f"Subscription {deleted_subscription.get('subscription_id')} deleted successfully"})

# Error handlers
@app.errorhandler(400)
def bad_request(error):
    return jsonify({"error": str(error.description)}), 400

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": str(error.description)}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({"error": "Internal server error"}), 500