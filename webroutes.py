'''
Classes to simplify the creation of web routes in Flask.
    These are browsable pages
    Pages are registered as a blueprint

Success messages are in this JSON format:
    {
        "result": "Success",
        "message": "Some nice message"
    }

Failure messages are in this JSON format:
    {
        "result": "Failure",
        "message": "Some error message"
    }
'''

from flask import (
    Blueprint,
    render_template,
    request,
    session,
)

from flask.views import MethodView

import platform
from importlib.metadata import version
import json

from config_parse import AppSettings, config
from azure import login_required
import requests


# Define a blueprint for the web routes
web_bp = Blueprint('web', __name__)


class BaseView(MethodView):
    '''
    BaseView class to handle common methods for the web application.

    Methods:
        get: Get method to render the index page of the web application.
        render_template: Render the template with the context data.
        get_context_data: Get the context data for the template
    '''

    template_name = None

    @login_required(
        groups=[config.azure_admin_group, config.azure_helpdesk_group]
    )
    def get(
        self,
        *args: list,
        **kwargs: dict,
    ) -> str:
        '''
        Get method to render the index page of the web application.
        '''

        return self.render_template(*args, **kwargs)

    def render_template(
        self,
        *args: list,
        **kwargs: dict,
    ) -> str:
        '''
        Render the template with the context data.
        '''

        return render_template(
            self.template_name,
            debug_mode=config.web_debug,
            api_base_url=config.api_base_url,
            **self.get_context_data(*args, **kwargs)
        )

    def get_context_data(
        self,
        *args: list,
        **kwargs: dict,
    ) -> dict:
        '''
        Get the context data for the template
        '''

        return {}


class IndexView(BaseView):
    template_name = 'index.html'

    def get_context_data(self, *args, **kwargs):
        # Get changelog information
        with open('changelog.json', 'r') as f:
            changelog = json.load(f)

        # Collect user information, if in debug mode use a default user
        if config.web_debug:
            user = 'N/A - Debug Mode'
            user_name = 'N/A - Debug Mode'
            groups = 'N/A - Debug Mode'
        else:
            user = session['user']['name']
            user_name = session['user']['preferred_username']
            groups = session['groups']

        return {
            'flask_version': version("flask"),
            'ip_address': request.remote_addr,
            'os_version': platform.platform(),
            'python_version': platform.python_version(),
            'user': user,
            'user_name': user_name,
            'groups': groups,
            'changelog': changelog,
        }


class UnauthorizedView(MethodView):
    def get(self):
        return render_template('unauthorized.html')


class DevicesView(BaseView):
    template_name = 'devices.html'

    def get_context_data(
        self,
    ) -> dict:
        '''
        Get devices, HA pairs, and sites

        Returns:
            dict: Context data for the template
        '''

        # Get the device list
        response = requests.get(
            f'{config.api_base_url}/api/device?action=list'
        )
        if response.status_code == 200:
            device_list = response.json()
        else:
            device_list = None

        # Get the HA pairs
        response = requests.get(
            f'{config.api_base_url}/api/device?action=ha'
        )
        if response.status_code == 200:
            ha_list = response.json()
        else:
            ha_list = None

        # Get the site list
        response = requests.get(
            f'{config.api_base_url}/api/site?action=list'
        )
        if response.status_code == 200:
            site_list = response.json()
        else:
            site_list = None

        return {
            'device_list': device_list,
            'ha_list': ha_list,
            'site_list': site_list,
            'device_count': len(device_list),
            'site_count': len(site_list),
            'ha_count': len(ha_list)
        }


class ObjectsView(BaseView):
    template_name = 'objects.html'


class PoliciesView(BaseView):
    template_name = 'policies.html'


class GlobalProtectView(BaseView):
    template_name = 'gp.html'


class VpnView(BaseView):
    template_name = 'vpn.html'


class SettingsView(BaseView):
    '''
    Handle the app settings page
    '''

    template_name = 'settings.html'

    @login_required(groups=[config.azure_admin_group])
    def get_context_data(
        self,
        config: AppSettings,
    ) -> dict:
        return {
            'tenant_id': config.azure_tenant,
            'app_id': config.azure_app,
            'app_secret': config.azure_secret,
            'callback_url': config.redirect_uri,
            'web_ip': config.web_ip,
            'web_port': config.web_port,
            'web_debug': config.web_debug,
            'web_admin_group': config.azure_admin_group,
            'web_helpdesk_group': config.azure_helpdesk_group,
            'api_ip': config.api_ip,
            'api_port': config.api_port,
        }


# Register the views
web_bp.add_url_rule(
    '/',
    view_func=IndexView.as_view('index')
)

web_bp.add_url_rule(
    '/unauthorized',
    view_func=UnauthorizedView.as_view('unauthorized')
)

web_bp.add_url_rule(
    '/devices',
    view_func=DevicesView.as_view('devices'),
)

web_bp.add_url_rule(
    '/objects',
    view_func=ObjectsView.as_view('objects')
)

web_bp.add_url_rule(
    '/policies',
    view_func=PoliciesView.as_view('policies')
)

web_bp.add_url_rule(
    '/globalprotect',
    view_func=GlobalProtectView.as_view('gp')
)

web_bp.add_url_rule(
    '/vpn',
    view_func=VpnView.as_view('vpn')
)

web_bp.add_url_rule(
    '/settings',
    view_func=SettingsView.as_view('settings'),
    defaults={'config': config}
)
