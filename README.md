# SIGNAL — Morse Code Translator

An interactive web-based Morse code translator. Press the telegraph key and the site decodes your signals into text in real time.

## How to Use

- **Short press** (≤ 250 ms) → dot `·`
- **Long press** (> 250 ms) → dash `—`
- **Pause 0.6 s** → end of letter
- **Pause 1.4 s** → word space
- You can also use the **Space bar** on your keyboard

## Features

- Morse input via button tap or Space bar
- Authentic 650 Hz sine-wave tone (can be muted)
- Copy and share the decoded result
- Full reference table: A–Z, 0–9, punctuation
- Dark / light theme toggle
- Responsive design

## Project Structure

```
morse-code/
├── home.html       # Main page
├── css/
│   └── style.css   # Styles (dark theme, animations)
└── js/
    └── app.js      # All logic (translation, audio, UI)
```

## Running Locally

Just open `home.html` in a browser — no installation required.  
For full functionality (audio, reference grid) serve via a local server:

```bash
npx serve .
```
