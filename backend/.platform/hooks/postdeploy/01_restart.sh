#!/bin/bash
# Elastic Beanstalk post-deploy hook
pm2 restart analytics-api || pm2 start server.js --name analytics-api



