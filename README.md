# Khair Bus (khairbus.com)

The original Khair Bus (adults) sign-up site. Separate from the kids site, Khair Bus Friends (friends.khairbus.com, repo khair-bus-friends); the two never link to each other.

- `index.html` — khairbus.com: a small two-choice page, only for people who type the address in.
- `home/` — khairbus.com/home: events, sign-ups (`event.html?id=…`) and the team dashboard (`admin.html`).
- Data: the same Firebase project as the kids site, but its own `events` collection (see `home/js/config.js`). Add `?demo` to any page to try it with sample data.
- GitHub Pages caches files for 10 minutes, so bump the `?v=` on the css/js links when they change.
