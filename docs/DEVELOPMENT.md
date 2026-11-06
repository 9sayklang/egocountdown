# Development notes

## Principles

- Keep the countdown readable before adding decoration.
- Use absolute timestamps for anything that must survive restarts.
- Keep secondary tools independent from the main countdown.
- Persist user preferences automatically, but keep user media local.
- Prefer browser APIs and plain JavaScript so the project can be inspected and run without a build system.
- Treat user backups and imported media as local data, never as repository fixtures.

## Verification

The implementation was checked in a disposable browser profile for:

- recovery of the original end timestamp and background;
- recovery of Pixel Journey and problem timer settings;
- typed custom problem timer values remaining stable while the UI updates;
- persistence of the problem timer after reload;
- loading the original local video library;
- importing an image into the browser library;
- opening video and image popup windows;
- absence of page errors during those flows.

## Smart App Control decision

The original Windows executable was left out of this repository. Smart App Control blocks unsigned executables based on the Windows Code Integrity policy. The browser edition avoids that launch path and leaves Windows security settings unchanged.

## Future work

- Add a small local development server for consistent file URL behavior.
- Add a portable media manifest that users can populate without embedding personal paths.
- Add automated browser tests to CI.
- Add an optional signed Windows wrapper only when a trusted RSA code-signing certificate is available.

