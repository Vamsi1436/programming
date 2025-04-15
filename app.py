import os
import logging
from flask import Flask, render_template
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create and configure the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "blacknight-secret-key")
CORS(app)  # Enable CORS for all routes

# Import routes after app is created to avoid circular imports
import api  # noqa

# Main routes for the web application
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/clients')
def clients():
    return render_template('clients.html')

@app.route('/services')
def services():
    return render_template('services.html')

@app.route('/subscriptions')
def subscriptions():
    return render_template('subscriptions.html')

@app.route('/about')
def about():
    return render_template('about.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)