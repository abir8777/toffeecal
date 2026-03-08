

## Plan: Replace App Logo with ToffeeCal Logo

### What changes

1. **Copy the uploaded logo** to `public/images/toffeecal-logo.png` (public folder since it's also needed in HTML meta tags).

2. **Update `index.html`**: Replace title "Lovable App" with "ToffeeCal", update meta descriptions and og:image/twitter:image to use the new logo, replace favicon reference.

3. **Update `src/pages/Dashboard.tsx`** (line 33): Replace the `<Flame>` icon with an `<img>` tag showing the ToffeeCal logo in the unauthenticated welcome screen.

4. **Update `src/components/auth/AuthDialog.tsx`** (lines 62-65): Replace the Flame icon box with the ToffeeCal logo image.

5. **Replace `public/favicon.ico`**: Generate/use the logo as the favicon (copy as a web-compatible icon reference, or add a `<link rel="icon">` pointing to the PNG).

### Files affected
- `public/images/toffeecal-logo.png` (new — copied from upload)
- `index.html` — title, meta tags, favicon link
- `src/pages/Dashboard.tsx` — logo in welcome screen
- `src/components/auth/AuthDialog.tsx` — logo in auth dialog

