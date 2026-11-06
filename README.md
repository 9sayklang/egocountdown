# Countdown Browser

Countdown Browser is a local-first countdown workspace for Windows. It turns the original Countdown desktop project into a browser app that can run through Microsoft Edge while Smart App Control is enabled. The project keeps the visual identity of the original app: a large countdown, a shrinking progress bar, a pixel-art journey, configurable background treatment, and a separate focus timer for solving problems.

The app stores its state in the browser profile. It does not need a server, account, database, or cloud API to run. The page can be opened from `index.html` or launched as an Edge app with `--app="file:///.../index.html"`.

## Why this project exists

The first version started as a five-day countdown. It grew through several design iterations:

1. A simple five-day web countdown.
2. A millisecond display, later removed because it made the interface hard to read.
3. A visual progress bar with a percentage that updates to two decimal places.
4. Editable background imagery with a frame transparency control from 0 to 100.
5. Settings for choosing a duration in days or a fixed end date and time.
6. A pixel-art journey that changes as time passes, including a character, scenery, weather, urgency effects, and second-by-second motion.
7. A motivation video library and a separate image window.
8. A separate problem-solving timer with presets, custom minutes, pause/resume, adding five minutes, and persistence across restarts.
9. A browser edition after Windows Smart App Control began blocking the unsigned desktop executable.

The browser edition preserves the user experience and local data while removing the unsigned executable from the launch path.

## Design ideas

The main design idea is psychological visibility: the countdown should remain the strongest visual element, while the surrounding scene gives the passage of time a narrative shape. The pixel character moves through a route toward a battle, the progress bar contracts, and the thought line changes at meaningful thresholds:

- `Prepare before the road gets hard.`
- `No one is coming. Keep moving.`
- `You have less time than you think.`
- `The easy part is over.`
- `Now we find out who you are.`
- `Stand your ground.`

The interface uses small controls near Settings so that actions remain available without competing with the countdown. The main countdown and the problem timer use separate storage keys and separate state machines.

## Features

- Countdown by a number of days or by a fixed end date and time.
- Automatic persistence using browser `localStorage`.
- Countdown continues from absolute wall-clock time after a restart.
- Days, hours, minutes, seconds, percentage, and a shrinking progress bar.
- Percentage displayed to two decimal places.
- Background image upload, image fitting, automatic color adaptation, theme presets, accent color, and outer-frame transparency.
- Pixel Journey settings: character, scene, movement, second effects, particles, urgency, reduced motion, weather, words, and ambient 40 Hz tone.
- Separate problem-solving timer with 15, 30, 45, and 60 minute presets.
- Custom problem timer input from 1 to 600 minutes.
- Problem timer pause, resume, reset, and `+5 minutes` controls.
- Problem timer survives closing and reopening the browser app.
- Motivation video library and separate popup windows for video and image viewing.
- Local backup and restore of countdown settings.
- No network dependency during normal use.

## Repository files

| File | Purpose |
| --- | --- |
| `index.html` | Main countdown layout, state management, settings, and finish dialog. |
| `journey.js` | Pixel Journey rendering and its settings state. |
| `journey.css` | Main application and journey styling. |
| `atmosphere.js` | Contextual words, weather, ambient tone, and story state. |
| `problem-timer.js` | Independent problem-solving timer and persistence. |
| `problem-timer.css` | Problem timer modal and button styling. |
| `browser.js` | Browser-specific video/image library, popup windows, backup, and restore. |
| `browser.css` | Browser library and popup styles. |
| `docs/` | Project history, architecture, data model, and development notes. |

## Running locally

Open `index.html` directly in Microsoft Edge for the basic countdown. For an app-like window, create a shortcut whose target is:

```text
C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
```

with arguments:

```text
--no-first-run --user-data-dir="%LOCALAPPDATA%\CountdownBrowser" --app="file:///ABSOLUTE/PATH/TO/Countdown-Browser/index.html"
```

Replace the page path with the absolute path on the local machine. The browser profile keeps the countdown state separate from the normal Edge profile.

## Privacy and publishing

The public repository must contain source code and documentation only. Do not commit a user's `recovered-backup.json`, browser profile, uploaded images, uploaded videos, or a generated `migration.js` containing personal paths and saved countdown data. The local recovery build used those files only to migrate one machine and is intentionally excluded from this public source package.

## License

MIT. See `LICENSE`.

