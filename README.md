# Blacknight Internet Solutions - Client Management System

A comprehensive web-based client management system for Blacknight Internet Solutions Ltd, a web hosting company based in Carlow, Ireland. The system provides a complete solution for managing clients, services, and subscriptions.

## Features

- **Client Management:** Add, view, edit, and delete client information with comprehensive profiles
- **Service Catalog:** Manage web hosting services with detailed specifications and pricing
- **Subscription Tracking:** Monitor client subscriptions, renewals, and billing
- **Responsive Design:** Mobile-friendly interface that works across all devices
- **Search & Filtering:** Easily find and organize clients, services, and subscriptions
- **Data Visualization:** View key metrics and statistics on the dashboard

## Technology Stack

- **Backend:** Python with Flask framework
- **Frontend:** HTML, CSS, JavaScript, Bootstrap 5
- **Data Storage:** JSON files for client, service, and subscription data
- **Icons & UI Elements:** Font Awesome, Bootstrap components

## Installation

1. Clone the repository
2. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Run the application:
   ```
   python main.py
   ```
   or
   ```
   gunicorn --bind 0.0.0.0:5000 main:app
   ```
4. Access the application at http://localhost:5000

## Project Structure

```
.
├── data/                   # Data storage directory
│   ├── clients.json        # Client information
│   ├── services.json       # Service catalog
│   └── subscriptions.json  # Subscription records
├── static/                 # Static assets
│   ├── css/                # CSS stylesheets
│   ├── js/                 # JavaScript files
│   └── images/             # Images and icons
├── templates/              # HTML templates
│   ├── index.html          # Dashboard/home page
│   ├── clients.html        # Client management
│   ├── services.html       # Service catalog
│   ├── subscriptions.html  # Subscription management
│   └── about.html          # About page
├── api.py                  # API endpoints for data manipulation
├── app.py                  # Main application setup
├── main.py                 # Application entry point
└── requirements.txt        # Python dependencies
```

## API Endpoints

### Clients
- `GET /api/clients` - Get all clients
- `GET /api/clients/<client_id>` - Get a specific client
- `POST /api/clients` - Create a new client
- `PUT /api/clients/<client_id>` - Update a client
- `DELETE /api/clients/<client_id>` - Delete a client

### Services
- `GET /api/services` - Get all services
- `GET /api/services/<service_id>` - Get a specific service
- `POST /api/services` - Create a new service
- `PUT /api/services/<service_id>` - Update a service
- `DELETE /api/services/<service_id>` - Delete a service

### Subscriptions
- `GET /api/subscriptions` - Get all subscriptions
- `GET /api/subscriptions/<subscription_id>` - Get a specific subscription
- `POST /api/subscriptions` - Create a new subscription
- `PUT /api/subscriptions/<subscription_id>` - Update a subscription
- `DELETE /api/subscriptions/<subscription_id>` - Delete a subscription

## Development

The application is designed with a clean separation of concerns:

- The `app.py` file configures the Flask application and defines routes
- The `api.py` file implements the API endpoints for data manipulation
- Template files use Bootstrap for responsive layout
- JavaScript files handle client-side logic for each page
- Data is persisted in JSON files for simplicity

## Mobile Responsiveness

The application is fully responsive and mobile-friendly:

- Adapts to different screen sizes (desktop, tablet, mobile)
- Mobile-optimized tables with horizontal scrolling
- Touch-friendly UI elements
- Collapsible navigation for smaller screens
- Optimized forms and modals for mobile input