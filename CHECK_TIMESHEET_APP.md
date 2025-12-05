# Check Timesheet App Status

The timesheet app might be running on the same EC2 instance. Let's check its status.

## Check PM2 Status

On your EC2 instance, run:

```bash
pm2 status
```

Look for a process named `nm2timesheet` or similar.

## Check if Timesheet App is Running

```bash
# Check all node processes
ps aux | grep node

# Check PM2 list
pm2 list

# Check timesheet app logs
pm2 logs nm2timesheet --lines 50
```

## Common Issues

1. **Process stopped** - Need to restart
2. **Port conflict** - Another app using the port
3. **Missing dependencies** - Need to run `npm install`
4. **Environment variables** - Missing .env configuration

## Restart Timesheet App

If it's managed by PM2:

```bash
pm2 restart nm2timesheet
# OR
pm2 start nm2timesheet
```

## Check Timesheet App Location

```bash
# Find timesheet app directory
find ~ -name "*timesheet*" -type d 2>/dev/null

# Or check common locations
ls -la ~/timesheet
ls -la ~/nm2timesheet
ls -la ~/Analytic-Shorts/timesheet
```



