# AI Visual Builder Studio – Quick Guide

Studio is the AI-powered dashboard builder at **/studio**. You describe what you want in plain language and get filters, KPIs, and charts.

## Create a dashboard

1. **Select a dataset** (left column): choose an example dataset (e.g. Sales, Attendance) or upload your own CSV/Excel.
2. **Describe the dashboard** in the prompt box, e.g.  
   *“Show revenue by month for 2025, add a date range filter, and a bar chart by product top 10.”*
3. Use **Quick add chart** and **Quick add filter** icons to append chart and filter phrases to the prompt.
4. Click **Generate** (or press **Ctrl+Enter** / **Cmd+Enter**). The preview updates with filters, KPIs, and charts.
5. Change **Theme** (Light / Dark / Executive) in the preview header if you like.

## Save and share

1. Enter a **Dashboard title** and click **Save dashboard**.
2. **Share link** – copies the link to view the dashboard at `/apps/:id` (requires login if your app uses auth).
3. **Get public link** – creates a view-only link that works **without login** (`/dashboard/shared/:shareId`).

## Open a saved dashboard

- In the left column under **Your saved dashboards**, click a name to open it in Studio for editing.
- Click **View** next to a name to open the dashboard at `/apps/:id` in a new tab.

## Other actions

- **Clear spec** – resets the current dashboard (you’ll be asked to confirm).
- **Load saved** – restores the last spec from browser storage (if any).

## Database setup for Studio

To store full dashboard specs when saving from Studio, run the migration that adds the `schema` column to `shorts_dashboards`. See **database/README.md** or run:

- **database/migration_add_dashboard_schema_column.sql** in your Supabase SQL Editor (or as part of your DB setup).

After that, saved dashboards persist with their full spec and can be reopened and shared as above.
