'''
Class to load app configuration
    Reads from a YAML file and stores the settings
'''

from yaml import safe_load, safe_dump
from colorama import Fore, Style


class AppSettings():
    '''
    Track all application settings
    Stored in YAML file, so this must be read and updated

    Methods:
        _read_config: Read the configuration file
        _validate_config: Validate the configuration file
        write_config: Write the configuration file
    '''

    def __init__(
        self
    ) -> None:
        '''
        Initialize the settings

        Validation flags:
            config_exists: True if the config file exists
            config_valid: True if the config file is valid
                This doesn't mean the settings are correct,
                    just that the file is valid
        '''

        # Validation flags
        self.config_exists = False
        self.config_valid = False

        # Get settings from the yaml file
        self._read_config()

    def _read_config(
        self
    ) -> None:
        '''
        Read the configuration file (config.yaml)
        Validate that it exists and is valid
        '''

        # Read the configuration file
        try:
            with open('config.yaml') as f:
                config = safe_load(f)

        except FileNotFoundError:
            self.config_exists = False
            print(
                Fore.RED,
                'Config file not found',
                Style.RESET_ALL
            )
            return
        self.config_exists = True

        # Validate the configuration file
        self._validate_config(config)
        if self.config_valid is not True:
            print(
                Fore.RED,
                'Config file is invalid',
                Style.RESET_ALL
            )
            return

        # Azure settings
        self.redirect_uri = config['azure']['redirect-uri']
        self.azure_tenant = config['azure']['tenant-id']
        self.azure_app = config['azure']['app-id']
        self.azure_secret = config['azure']['app-secret']
        self.azure_admin_group = config['azure']['admin-group']
        self.azure_helpdesk_group = config['azure']['helpdesk-group']

        # Web server settings
        self.web_ip = config['web']['ip']
        self.web_port = config['web']['port']
        self.web_debug = config['web']['debug']

        # API settings
        self.api_ip = config['api']['ip']
        self.api_port = config['api']['port']
        self.api_base_url = f'http://{self.api_ip}:{self.api_port}'

    def _validate_config(
        self,
        config: dict,
    ) -> None:
        '''
        Validate the configuration file settings
            This is to ensure all settings are present
            Does not check if the settings are correct

        1. Check for the 'azure' section
        2. Check for the 'web' section
        3. Check that 'debug' is true/false

        Args:
            config (dict): The configuration settings
        '''

        # Check for the 'azure' section
        if 'azure' not in config:
            print(
                Fore.RED,
                "Config: The 'azure' section is missing from the config file.",
                Style.RESET_ALL
            )
            self.config_valid = False
            return

        # Check for the 'web' section
        if 'web' not in config:
            print(
                Fore.RED,
                "Config: The 'web' section is missing from the config file.",
                Style.RESET_ALL
            )
            self.config_valid = False
            return

        # Check that 'debug', 'ip', 'port'
        #   all exist in the web section
        if not all(
            key in config['web'] for key in ['debug', 'ip', 'port']
        ):
            print(
                Fore.RED,
                "Config: All parameters need to exist in the web section:\n",
                "'debug', 'ip', 'port'",
                Style.RESET_ALL
            )
            self.config_valid = False
            return

        # Check that 'debug' is set to true/false
        debug = config.get('web', {}).get('debug')
        if debug is not True and debug is not False:
            print(
                Fore.RED,
                "Config: The 'debug' setting must be true or false.",
                Style.RESET_ALL
            )
            self.config_valid = False
            return

        # Check that 'api' section exists
        if 'api' not in config:
            print(
                Fore.RED,
                "Config: The 'api' section is missing from the config file.",
                Style.RESET_ALL
            )
            self.config_valid = False
            return

        # Check that 'ip' and 'port' exist in the 'api' section
        if not all(
            key in config['api'] for key in ['ip', 'port']
        ):
            print(
                Fore.RED,
                "Config: All parameters need to exist in the api section:\n",
                "'ip', 'port'",
                Style.RESET_ALL
            )
            self.config_valid = False
            return

        # When all checks pass
        self.config_valid = True

    def write_config(self) -> None:
        '''
        Write the configuration file (config.yaml)
        This is to update settings
        '''

        # Write the configuration file
        config = {
            'azure': {
                'redirect-uri': self.redirect_uri,
                'tenant-id': self.azure_tenant,
                'app-id': self.azure_app,
                'app-secret': self.azure_secret,
                'admin-group': self.azure_admin_group,
                'helpdesk-group': self.azure_helpdesk_group,
            },
            'web': {
                'ip': self.web_ip,
                'port': self.web_port,
                'debug': self.web_debug,
            },
            'api': {
                'ip': self.api_ip,
                'port': self.api_port,
            }
        }

        try:
            with open('config.yaml', 'w') as f:
                safe_dump(config, f)

        except Exception as e:
            print(e)


# Instantiate the object
config = AppSettings()
