"""
Main module for starting the Network Frontend.
    This is the entry point for the web application.
    This is a web front end for the API backend.

Relies on the existance and correct formatting of config.yaml
    If this does not exist or is invalid, the web application will not start.
    This contains enough information to start the web application.

Usage:
    Run this module to start the web application.

Example:
    $ python main.py
"""


from flask import Flask
from colorama import Fore, Style
import os

from config_parse import config
from webroutes import web_bp
from azure import azure_bp

# Flask web app; Secret key is used for session management
app = Flask(__name__)
app.secret_key = os.getenv('api_master_pw')

# Validate the configuration
if config.config_exists is False:
    print(
        Fore.RED,
        'Config file not found, exiting',
        Style.RESET_ALL
    )
    exit(1)

if config.config_valid is False:
    print(
        Fore.RED,
        'Config file is invalid, exiting',
        Style.RESET_ALL
    )
    exit(1)

# Load the routes
app.register_blueprint(web_bp)
app.register_blueprint(azure_bp)


if __name__ == '__main__':
    app.run(
        host=config.web_ip,
        port=config.web_port,
        debug=config.web_debug,
    )
