# Demo Visit Tracker

Know the moment a prospect clicks the link in your outreach email and lands on their demo —
**and who they are** (business name, email, phone), by matching a short `?ref=` code against a
lookup list you control.

Each demo page fires a tiny fire-and-forget "ping" when it loads in a real browser.
The ping goes to a free Google Apps Script Web App, which:
1. resolves the `?ref=` code against a **`Prospects`** tab,
2. logs the visit to a **`Visits`** tab, and
3. emails you an instant alert with the matched business name + email + phone.

> The ping only fires when the **page actually loads in a browser** — not when an email
> is merely opened. So it reflects genuine visits, not email opens.

---

## 1. Deploy the backend

**First time:**
1. Create a Google Sheet (this holds the log + lookup).
2. **Extensions → Apps Script**, delete the placeholder, paste in [`Code.gs`](./Code.gs).
3. Set `ALERT_EMAIL` at the top to your address (or `""` to disable emails).
4. Save, then **Run → `setup`** once to create the `Prospects` and `Visits` tabs.
5. **Deploy → New deployment → Web app** — Execute as: **Me**, Who has access: **Anyone**.
   Copy the `/exec` URL and make sure it's the one wired into the pages.

**Updating an existing deployment (Option B upgrade):**
Because the pages already point at your `/exec` URL, keep that **same URL** so you don't have
to touch any pages:
1. Extensions → Apps Script → replace the code with the new [`Code.gs`](./Code.gs). Save.
2. **Deploy → Manage deployments → (pencil / Edit) → Version: New version → Deploy.**
   - Do **not** pick "New deployment" — that would create a *different* URL.
3. Run **`setup`** once to add the `Prospects` tab.
4. One-time tidy: the `Visits` tab gained new columns. Delete your old test rows (or clear the
   `Visits` tab) so the new headers line up.

## 2. Fill in your Prospects tab

Add one row per prospect. The **Ref code** is the short slug you'll put in the email link.

| Ref code | Business | Email | Phone | Notes |
|---|---|---|---|---|
| joescafe | Joe's Cafe | joe@joescafe.com | +61 400 000 000 | Met at expo |
| breezepro | BreezePro Air | ops@breezepro.com | +61 8 6555 1234 | Cold outreach |
| happypaws | Happy Paws Training | hi@happypaws.com | +61 400 111 222 | Referral |

- Match is **case-insensitive** and trimmed, so `JoesCafe` = `joescafe`.
- Keep codes short, unique and free of spaces (e.g. `joescafe`, not `joe's cafe`).

## 3. Build your email links (per prospect)

Point each prospect at their demo, tagged with **their ref code**:

```
https://skullmanhell1.github.io/demowebsite/food-cafe-bakery/?ref=joescafe
https://skullmanhell1.github.io/demowebsite/home-hvac/?ref=breezepro
https://skullmanhell1.github.io/demowebsite/pet-training/?ref=happypaws
```

- Folder = which demo you're showing them.
- `?ref=joescafe` = which prospect (looked up in the Prospects tab).

When they visit, the alert reads:

```
Demo visit: Joe's Cafe (joe@joescafe.com) -> food-cafe-bakery
Business:  Joe's Cafe
Email:     joe@joescafe.com
Phone:     +61 400 000 000
Ref code:  joescafe
...
```

`utm_content` / `utm_campaign` also work as fallbacks if you prefer standard UTM tags.

---

## What gets recorded (Visits tab)

| Column | Meaning |
|---|---|
| Received | Server timestamp of the visit |
| Ref code | The `?ref=` code from the link |
| Business / Email / Phone | Pulled from the matching Prospects row |
| Site | Which demo (e.g. `home-hvac`) |
| Page | Path visited |
| Referrer | Where they came from (often blank/direct from an email) |
| Language / Screen | Basic device hints |
| Client time | Timestamp from the visitor's browser |
| Notes | Copied from the Prospects row |

## Notes & limits

- **You can't read a visitor's email from their browser** — no tracker can. This works because
  *you* assigned the ref code, so the lookup maps it back to the contact you emailed.
- If a prospect **forwards** the link, a forwarded visit is still attributed to the original ref.
- Unknown / missing ref codes are still logged and alert as "unknown ref — add it to Prospects".
- No cookies or personal data are read from the browser — only the ref code + basic hints.
  Keep outreach transparent and honour opt-outs.
- Email alerts are de-duplicated per ref+demo for `DEDUPE_MINUTES` (default 6h); the Visits tab
  logs every hit regardless.
- Consumer Gmail allows ~100 automated emails/day.
