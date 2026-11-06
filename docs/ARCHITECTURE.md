# Architecture

## Runtime layers

```text
index.html
├── Main countdown state machine
├── Settings and appearance controls
├── Finish dialog: You Win or Lose
├── journey.js / journey.css
├── atmosphere.js
└── problem-timer.js / problem-timer.css

browser.js / browser.css
└── Browser-only media library, popup windows, backup, and restore
```

The main page owns the primary countdown. It calculates the remaining time from `endTime - Date.now()` and renders the four time units, percentage, progress bar, and finish state. It stores the start and end timestamps instead of decrementing a counter, so the result remains correct after the page is closed.

`journey.js` reads the same remaining-time model but owns the visual journey. Its state contains the selected character, scene, movement level, visual effects, and reduced-motion preference. It does not change the main timer.

`atmosphere.js` owns contextual words, weather transitions, and the optional ambient tone. Audio starts only after a user gesture because browser autoplay policies require a gesture before audio can play.

`problem-timer.js` uses a separate storage key. It keeps `durationMs`, `remainingMs`, `endTime`, `running`, and `completed`. When running, the visible time is calculated from the absolute `endTime`; when paused, the remaining duration is saved directly.

`browser.js` adds the browser edition's media controls. Existing videos can reference local file URLs. Newly added media is stored in IndexedDB so that object URLs are not lost when the page reloads. Popup windows receive their own player or image element and offer fullscreen and close controls.

## Storage keys

All application keys use the `five-day-countdown-` prefix. The important keys are:

| Key | Data |
| --- | --- |
| `five-day-countdown-end` | Main absolute end timestamp. |
| `five-day-countdown-start` | Main round start timestamp. |
| `five-day-countdown-config-v2` | Days/target mode and duration settings. |
| `five-day-countdown-background` | Uploaded background and sampled RGB theme data. |
| `five-day-countdown-frame-transparency` | Outer frame transparency. |
| `five-day-countdown-pixel-journey-v1` | Pixel Journey preferences. |
| `five-day-countdown-journey-story-v1` | Atmosphere story progress. |
| `five-day-countdown-problem-timer-v1` | Independent problem timer. |

The browser media library uses `countdown-browser-library-v1` in `localStorage` and `countdown-browser-media` in IndexedDB.

