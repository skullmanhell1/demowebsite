# Demo Visit Tracker

Know the moment a prospect clicks the link in your outreach email and lands on their demo.

Each demo page fires a tiny fire-and-forget "ping" when it loads in a real browser.
The ping goes to a free Google Apps Script Web App, which logs it to a Google Sheet
and can email you an instant alert.

> The ping only fires when the **page actually loads in a browser** — not when an email
> is merely opened. So it reflects genuine visits, not email opens.

---

## 1. Deploy the backend (~10 minutes, one time)

1. Create a new **Google Sheet** (this holds the visit log).
2. In the Sheet: **Extensions → Apps Script**.
3. Delete the placeholder code, then paste in the contents of [`Code.gs`](./Code.gs).
4. Change `ALERT_EMAIL` at the top to the address that should receive alerts.
   (Set it to `""` if you only want the Sheet log and no emails.)
5. **Deploy → New deployment → Web app**:
   - **Execute as:** Me
   - **Who has access:** Anyone
6. Authorise when prompted, then **copy the Web app URL** — it ends in `/exec`.

## 2. Point the pages at your endpoint

In every demo page there is a tracker snippet (just before `</head>`) containing:

```js
var TRACKER_ENDPOINT = "https://script.google.com/macros/s/REPLACE_WITH_YOUR_DEPLOYMENT_ID/exec";
```

Replace that placeholder with the `/exec` URL you copied in step 1.

> Fastest way: search-and-replace `REPLACE_WITH_YOUR_DEPLOYMENT_ID` across the repo with
> your real deployment ID, commit, and let GitHub Pages redeploy. Ask me and I'll do it
> for you once you have the URL.

## 3. Build your email links (per prospect)

Add a `?ref=` tag to identify **who** you emailed. Use a short slug for each prospect:

```
https://skullmanhell1.github.io/demowebsite/food-cafe-bakery/?ref=morning-crust-cafe
https://skullmanhell1.github.io/demowebsite/home-hvac/?ref=breezepro
https://skullmanhell1.github.io/demowebsite/pet-training/?ref=happy-paws
```

- `food-cafe-bakery` = which demo you're showing them.
- `?ref=morning-crust-cafe` = which prospect it was.

When they visit, you'll see (email + Sheet row):

```
Demo visit: morning-crust-cafe -> food-cafe-bakery
```

`utm_content` and `utm_campaign` also work as fallbacks if you prefer standard UTM tags.

---

## What gets recorded

| Column | Meaning |
|---|---|
| Received | Server timestamp of the visit |
| Site | Which demo (e.g. `home-hvac`) |
| Ref (prospect) | Your `?ref=` tag |
| Page | Path visited |
| Referrer | Where they came from (often blank/direct from an email) |
| Language / Screen | Basic device hints |
| Client time | Timestamp from the visitor's browser |

## Notes & limits

- **No cookies, no personal data** are collected — just the tag you assign plus basic
  browser hints. Keep your outreach transparent and honour opt-outs.
- Email alerts are de-duplicated per prospect+demo for `DEDUPE_MINUTES` (default 6h) to
  avoid spamming you on reloads.
- Consumer Gmail allows ~100 automated emails/day. If you outgrow that, switch alerts off
  and just watch the Sheet, or move the endpoint to a paid tier.
- Bots that execute JavaScript (rare) could trigger a ping; most link-preview crawlers do
  not run JS, so they won't.
