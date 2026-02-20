# Dashboard Guide – In Plain Language

This guide explains what each dashboard view does and what common terms mean, so you can use the app without guessing.

---

## Dashboard views (tabs at the top)

### **Charts**
The main view: a **line chart** (how a number changes over time), a **pie/donut chart** (breakdown by category), and **metric cards**. Use the **View by** and **View metric** tabs to change what you’re looking at. For contract opportunities you also get a **map** (by state) and a **by organization** pie when you pick a base type.

### **Advanced**
Same data as Charts, but with **more charts on one page**: line, donut, bar, and sometimes a sunburst (nested breakdown). Good for seeing several angles at once. Use **Filters** to pick date range, category, and metric. **Hover over column names** (e.g. COG, SOG) to see what they mean.

### **Custom**
A **grid layout** where you can place and resize charts yourself. Use this when you want your own arrangement of the same data.

### **Time Series**
Focused on **trends over time**: one or more line charts by date. Pick a date column and one or more numbers to track.

### **Data & Metadata**
Shows the **raw table** and **column types** (date, number, category). Use this to check or edit how the app interprets your columns.

---

## What each dataset is about

### **Sales / product data**
Everyday business data: **sales, revenue, units** by **date, product, category, region**. Use it to see what sells, where, and over time.

### **Maritime AIS (vessel tracking)**
**Ship and boat positions** from AIS (Automatic Identification System). Each row is one “ping”: when a vessel reported its **location (lat/lon), speed (SOG), direction (COG), and type**. Use it for traffic over time, busiest vessels (by MMSI), or slow/loitering vessels (low speed).

### **SAM.gov Contract Opportunities**
**Live federal contract opportunities** from the U.S. government (solicitations, presolicitations, sources sought). Each row is one opportunity: **title, posting date, deadline, issuing organization, state, NAICS, set-aside type**, etc. Use it to see who’s posting what, where, and by base type (e.g. Solicitation) and organization.

### **USA Spending**
**Federal spending**: awards, contracts, grants. **Award amount, awarding agency, recipient, state, NAICS**, etc. Use it to see who got money, from which agency, and where.

### **Other built-in examples**
**Attendance** (hours by employee/department), **donations** (amount by donor/category), **medical** (visits, costs, diagnoses), **banking** (transactions), **hotel/today-snapshot** (occupancy, revenue, ADR, RevPAR), **revenue-trends**, **alerts-insights**. Each is sample or demo data for that theme.

---

## Glossary – terms explained (hover in Advanced for these)

| Term | Meaning |
|------|--------|
| **COG** | **Course over ground** – the direction a vessel is moving, in degrees (0–360). 0 = North, 90 = East, 180 = South, 270 = West. |
| **SOG** | **Speed over ground** – how fast a vessel is moving, in **knots** (nautical miles per hour). Low SOG (e.g. &lt; 1) can mean anchored or loitering. |
| **MMSI** | **Maritime Mobile Service Identity** – a unique 9-digit number for each vessel (like an ID). Used to count “how many messages per ship” or “top vessels.” |
| **Lat / Lon** | **Latitude and longitude** – position on the map. Used for mapping vessel or opportunity location. |
| **Vessel type** | Kind of ship or boat: e.g. Cargo, Tanker, Passenger, Fishing, Pleasure. |
| **Base type** | For contract opportunities: **Solicitation** (full RFP), **Presolicitation** (early notice), **Sources Sought** (market research). Picking one filters the list and the “by organization” pie. |
| **Organization** | The **agency or office** that posted the opportunity (e.g. “DLA Aviation Philadelphia”). Shortened from the full hierarchy for display. |
| **Posted date** | When the opportunity was published on SAM.gov. |
| **Response deadline** | When responses (e.g. proposals) are due. |
| **Set-aside** | Special eligibility (e.g. small business, 8(a), HUBZone). Shown when the data includes it. |
| **NAICS** | **North American Industry Classification System** – a code that describes the type of work (e.g. 541511 = IT). Shown when the opportunity has one. |
| **ADR** | **Average daily rate** – in hotel data, average revenue per room per day. |
| **RevPAR** | **Revenue per available room** – total room revenue ÷ available rooms. |
| **Occupancy rate** | Percentage of rooms (or capacity) that are occupied. |

---

## Quick tips

- **View by** = which category (or date) to break the charts by (e.g. by Organization, by Base type, by State).
- **View metric** = which number to show (e.g. Sales, SOG, Opportunity count, Award amount).
- **Filters** (in Advanced) = narrow by date range, category value, or numeric range.
- **Clicking a chart** (bar, pie slice, line point) often **filters** the rest of the dashboard to that selection; click again to clear.
- **Maritime:** “Loitering” usually means SOG &lt; 1 knot (vessels barely moving).
