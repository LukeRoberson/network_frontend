# Network Management Frontend

A front-end for network management, that integrates with a network API.

This project:
https://github.com/LukeRoberson/network_frontend

API:
https://github.com/LukeRoberson/network-api

## Requirements

- Python 3.10 or later
- Modules as listes in requirements.txt
- uWSGI should be used in production
- NGINX should be used in production, for certificates and other security

## Containers

This application is intended to be built as a container.

Tags:
- 'devel' - The build used for testing
- 'latest' - The latest version for production
- 'v1' - The current version (v1, v2, etc)

To build the container:

```
docker build -t <username>/<repository>:<tag> .
```

To push the container to docker hub:

1. Generate a token
2. Login with 'docker login --username <USER>'
3. Enter token as the password

```
docker push <USERNAME>/<repository>:<tag>
```

# Configuration
## Configuration File

Configuration is stored in config.yaml.

This contains just enough configuration to get the app started.


## Authentication

Authentication uses MS Azure. Create an app in Azure which checks users.

The app details are stored in the configuration file.
