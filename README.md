# Simple Oven: website and online ordering (Cloudflare Pages)

A fast bakeshop website. Orders and payment screenshots are emailed to you through **Resend**, sent from two small server functions on **Cloudflare Pages**.
Cloudflare's free plan allows business use, so hosting costs **₱0/month**.
Your email address is **never** in the website code. It's stored only as a secret setting on Cloudflare.

```
simple-oven/
├─ public/                 ← everything visitors download (the website)
│  ├─ index.html
│  ├─ css/styles.css
│  ├─ js/products.js       ★ MENU, PRICES, PAYMENT DETAILS + starting settings
│  ├─ js/app.js            pages, cart, cookie box, checkout, animations
│  ├─ assets/              logo, photos, cookie cut-outs, paper textures, fonts
│  └─ _headers             caching + security settings for Cloudflare
├─ functions/api/          ← Cloudflare turns these into /api/order and /api/payment-proof
├─ server/                 order + payment logic (checks, prices, emails, Google Sheets)
├─ google-sheets/Code.gs   paste into Google Sheets to log every order (optional)
├─ dev-server.mjs, tests/  for testing on your computer
└─ .dev.vars.example       list of the secret settings you need
```

---

## 1. Set up Resend (free, about 5 minutes)

1. Go to **https://resend.com** and **Sign up** with the **same email that should receive orders**.
   (On the free plan without your own domain, Resend can only send to the email you signed up with.)
2. Left menu: **API Keys → Create API Key**. Name it `simple-oven`, permission **Sending access**, then **Create**.
3. Copy the key (it starts with `re_…`). You only see it once.

## 2. Put the website on Cloudflare Pages (free)

> ⚠ Cloudflare's **drag-and-drop upload does not run the `functions` folder**, so orders wouldn't work. Use **Option A (GitHub)** or **Option B (one command)**.

### Option A: through GitHub (no installing, recommended)
1. Make a free account at **github.com**, then **+ → New repository**, name it `simple-oven`, **Create**.
2. Unzip the project. On the repository page click **"uploading an existing file"**, drag in everything *inside* the `simple-oven` folder (`public`, `functions`, `server`, …), then **Commit changes**.
3. Make a free account at **dash.cloudflare.com**.
4. **Workers & Pages → Create → Pages → Connect to Git**, then pick your `simple-oven` repository.
5. Build settings:

| Setting | Value |
|---|---|
| Framework preset | **None** |
| Build command | `exit 0` |
| Build output directory | `public` |

6. Click **Save and Deploy**. In about a minute you get a link like `simple-oven.pages.dev`.

### Option B: one command from your computer
Install **Node.js** (nodejs.org), open a terminal inside the `simple-oven` folder and run:
```bash
npx wrangler login            # opens the browser, log in to Cloudflare
npx wrangler pages deploy     # uploads public/ + functions/
```

## 3. Add your secret settings (turns on order emails)

Cloudflare → **Workers & Pages → simple-oven → Settings → Variables and Secrets → Add** (choose type **Secret**, environment **Production**):

| Name | Value | Required? |
|---|---|---|
| `RESEND_API_KEY` | the `re_…` key from step 1 | ✅ yes |
| `ORDER_TO_EMAIL` | the inbox that gets orders (your Resend sign-up email) | ✅ yes |
| `ORDER_FROM_EMAIL` | `Simple Oven <orders@yourdomain.com>` | only after you verify a domain in Resend |
| `SEND_CUSTOMER_CONFIRMATION` | `true` | only after you verify a domain |
| `ALLOWED_ORIGIN` | `https://simple-oven.pages.dev` (your real address) | optional, blocks other sites from using your order form |
| `ADMIN_PASSWORD` | a long password only the owner knows | ✅ for the owner page (section 10) |
| `SHEETS_WEBHOOK_URL` / `SHEETS_SECRET` | see section 8 | optional |

Then **Deployments → latest → ⋯ → Retry deployment**. Settings only apply to new deployments.
Place a test order. The email should arrive within seconds (check Spam the first time and mark it "Not spam").

**Updating the site later:** with Option A, edit a file on GitHub (e.g. `public/js/products.js`) and Cloudflare redeploys automatically. With Option B, run `npx wrangler pages deploy` again.

**Own domain (optional):** Pages project → **Custom domains → Set up a domain**. Then verify the same domain in Resend (**Domains → Add Domain**) to send from `orders@yourdomain`.

### Free-plan limits (plenty for a bakeshop)
- Pages and photos: unlimited visits.
- Orders + payment uploads: up to 100,000 per day, resetting at 8am Philippine time.
- Each order gets a small amount of computer time. Payment screenshots are shrunk on the customer's phone first, so they fit easily.

---

## 4. How ordering works

```
Customer ──► Cookie box (cart) ──► Checkout ──► /api/order (Cloudflare)
                                                  │ 1. checks every field
                                                  │ 2. recalculates prices from public/js/products.js
                                                  │ 3. emails you the order via Resend
                                                  │ 4. (optional) adds a row to Google Sheets
                                                  ▼
             box gets packed + ribbon ──► Thank-you page (order no. + How to pay + upload screenshot)
```

- **If sending fails**, the customer sees a clear message. Their cart is kept so they can retry.
- **No double orders** if someone taps twice. **Spam protection** with a hidden honeypot field and a per-device limit.
- **Reply to the customer** by hitting Reply on the order email (if they gave an email).
- **Payment screenshots** arrive as a separate "💸 Payment proof" email with the image attached.

## 5. Choosing the design (3 options)

All three looks share the same menu, cart, checkout and order email. Only the style changes.

| Option | `design` value | Look |
|---|---|---|
| A | `paper` | Cream kraft paper, elegant serif, one cookie dunked into a milk splash, 3D tilt, tap for crumbs |
| B | `night` | Espresso dark, caramel glow, a big cookie in the spotlight with price tags |
| C | `sticker` | Bold lowercase type like the logo, color-block cards, cookie stickers you can drag |

To pick one, open `public/js/products.js` and set `design: 'paper'` (or `'night'` / `'sticker'`).
To compare them on the live site without changing anything, add `?design=night` or `?design=sticker` to the address (e.g. `simple-oven.pages.dev/?design=sticker`).

## 6. Changing the menu

Open `public/js/products.js`:
- **Price:** change `price: 380`.
- **New flavor:** copy one product block, give it a new `id`, and set the name, description and prices.
- **Photo:** put a `.webp` file in `assets/img/` (plus a smaller `-sm.webp` version), then set `img: 'file-name'` and `gallery: [...]`.
  Products with `img: null` show a "Photo soon" illustration (currently only Biscoff Revel Bars).

Save the file and redeploy (or push to GitHub). The server uses the same file, so prices always match.

## 7. Settings in `public/js/products.js`

> Availability, pick-up days, pick-up times, ordering rules, pick-up place and the announcement are changed on the **owner page** (section 10), no GitHub needed. The values below are only the starting values.

| What | Setting | Example |
|---|---|---|
| Your GCash / bank details | `payment: { gcashName, gcashNumber, bankName, bankAccountName, bankAccountNumber }` | `gcashNumber: '0917 123 4567'` (lines left `''` are hidden) |
| A flavor is sold out | `soldOut: true` on that product | Card shows "Sold out", can't be ordered |
| Dates you're closed | `closedDates: ['2026-12-25', …]` | Holidays, fully booked days |
| Days you're always closed | `closedWeekdays: [1]` | `1` = every Monday (0 = Sunday) |
| Pick-up place & rider note | `pickup: { place, city }` | `place: 'Meshroom'`. Customers pick up, or book their own rider |
| Earliest order date | `minLeadDays: 1` | `2` = customers can order 2 days ahead at the earliest |

The server reads the same file, so a sold-out flavor or closed date can't be ordered, even by tricking the page.

## 8. Google Sheets order log + Google Calendar (optional, about 5 minutes)

Every order becomes an **event on your Google Calendar** at its pick-up date and time (reminder the day before) and a row in a Sheet (with a **Status** dropdown: New → Check payment → Confirmed → Baking → Done). When a payment screenshot arrives, that order's **Payment proof** cell turns green.

1. Create a new Google Sheet (e.g. "Simple Oven Orders").
2. **Extensions → Apps Script**. Delete what's there and paste everything from `google-sheets/Code.gs`. Click 💾 Save.
3. ⚙️ **Project Settings → Script Properties → Add script property**: Property `SECRET`, Value: any long random text (e.g. `simpleoven-8f3k29xq`).
4. **Deploy → New deployment** → type **Web app** → *Execute as*: **Me** → *Who has access*: **Anyone** → **Deploy**, then allow access.
5. Copy the **Web app URL**.
6. In Cloudflare, add `SHEETS_WEBHOOK_URL` = that URL and `SHEETS_SECRET` = the same secret text. Then redeploy (Deployments → ⋯ → Retry deployment).

If Sheets is ever down, orders still go through by email. The Sheet is only a bonus copy.

## 9. Test on your computer (optional)

```bash
# needs Node.js 18+
cp .dev.vars.example .dev.vars   # then fill in your real values
npm run dev                      # quick preview → http://localhost:3000
MOCK_RESEND=1 npm run dev        # test without sending real email (saved to .mail-outbox/)
npm run dev:cf                   # run on Cloudflare's own local runtime → http://localhost:8788
npm test                         # automatic checks for prices, dates, gifts, uploads
```

## 10. Owner page: change availability, days and times from your phone

Go to **`https://simple-oven.pages.dev/#/admin`** (there's also a small "Owner login" link at the bottom of the site) and log in with your password.

| Section | What it does |
|---|---|
| 1 What's available | Switch a flavor off → it shows "Sold out" and can't be ordered |
| 2 Pick-up days | Tap days on the calendar to close/open them, or close a weekday every week |
| 3 Pick-up times | The time choices customers see at checkout |
| 4 Ordering rules | How many days before pick-up customers must order (default 1), optional last-order time, how far ahead they can book |
| 5 Pick-up place | Place name, city and the Google Maps pin link shown at checkout |
| 6 Announcement | Optional bar at the top of the website |

Press **Save changes**. The website and the order server both use the new settings within seconds.

### One-time setup (about 3 minutes)
1. ✅ Done: the KV storage `simple-oven-settings` is created and connected in `wrangler.toml` (binding `SETTINGS`).
2. **Settings → Variables and Secrets → Add** → type **Secret**, name **`ADMIN_PASSWORD`**, value: a long password. Save.
3. **Deployments → latest → ⋯ → Retry deployment.**

Free plan: up to 1,000 saves per day, more than enough. If the KV storage is missing, the site still works with the starting values from `products.js`.
