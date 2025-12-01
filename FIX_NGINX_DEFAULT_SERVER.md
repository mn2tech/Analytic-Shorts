# Fix Nginx Default Server Issue

The problem: When accessing by IP, Nginx doesn't match `server_name api.nm2tech-sas.com`, so it uses the default_server which returns 404.

## Solution: Update the API config to handle IP access

We need to modify the API config to also handle requests by IP address.

