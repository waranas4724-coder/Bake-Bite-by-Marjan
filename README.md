# Bake & Bite by Marjan — Render Web App

## Features
- FNP-style cake shopping structure: categories, flavours/types, occasions, search, product/post cards and order flow.
- No product prices are displayed.
- WhatsApp ordering: +8801880610740.
- Location: Chattogram, Bangladesh.
- Order email target: marjanchybc@gmail.com.
- Payment methods: bKash, Nagad, Rocket + Pay later/WhatsApp confirmation.
- Admin panel: `/admin`
- Admin can add cake posts with **photo OR video**, title, description, category and featured flag.
- Admin can delete posts and manage orders.
- Admin settings store WhatsApp, email, location, Facebook Page URL and payment numbers.
- SQLite database and uploaded media are placed on Render's persistent disk when deployed with `render.yaml`.

## Render
1. Push this entire folder to GitHub.
2. Create a Render Web Service from the repository.
3. `render.yaml` can configure the service and persistent disk.
4. Set `ADMIN_PASSWORD` to a strong private password.
5. For email notifications, set SMTP_HOST, SMTP_USER, SMTP_PASS and SMTP_FROM. Gmail/Google Workspace SMTP or another SMTP provider can be used.
6. Open `/admin` for the private admin panel.

## Important storage note
The Facebook Page itself is not stored by this app. The Facebook Page URL is stored in the SQLite `settings` table. Facebook posts/media remain on Facebook. Cake photos/videos uploaded through the admin panel are stored in `/var/data/uploads` on the Render persistent disk.

If you use a Render plan without persistent disk, uploaded media and the SQLite database can be lost on redeploy/restart. Use a persistent disk or external object storage for production.

## Payment
This version is a manual payment workflow, not a direct bKash/Nagad/Rocket API gateway. Customers select a payment method and can enter a transaction ID; the admin confirms the order. API/merchant integration can be added later if merchant credentials are provided.

## Product images
The website uses its own visual placeholders until you upload product photos. The product names/categories are based on the kinds of cake categories and listings visible on the referenced FNP page, but FNP's copyrighted product photography is not copied into this project.
