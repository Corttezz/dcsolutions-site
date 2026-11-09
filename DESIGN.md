---
name: DC Solutions
description: Company showcase for small digital products, each made to solve one thing.
colors:
  anil: "#1f2d4d"
  anil-fundo: "#16203a"
  anil-claro: "#2c3d63"
  algodao: "#f1f2ee"
  algodao-2: "#e4e6e1"
  linha: "#c9ced6"
  grafite: "#2b2f36"
  cinza: "#59606b"
  nevoa: "#b9c2d3"
  celeste: "#8fb4ff"
  iqnorth: "#3a34c4"
  fytform: "#84cc16"
  h2hscout: "#f6b73c"
  grimoire: "#2a1a12"
  legal-text: "#8e98ab"
  card-iqnorth: "#14172e"
  card-iqnorth-accent: "#a29eff"
  card-iqnorth-on-accent: "#0e1024"
  stage-iqnorth: "#2b27a0"
  card-fytform: "#0f1712"
  card-fytform-accent: "#9be15d"
  card-fytform-on-accent: "#0b1a05"
  stage-fytform: "#2e4a12"
  card-h2hscout: "#131a17"
  card-h2hscout-on-accent: "#14201b"
  stage-h2hscout: "#2a3a31"
  card-grimoire: "#1a110d"
  card-grimoire-accent: "#d9a441"
  card-grimoire-text: "#efe2c4"
  card-partiugringa: "#0f2a28"
  card-partiugringa-accent: "#5eead4"
  card-partiugringa-text: "#e6fffb"
  card-ismeire: "#f6f3ec"
  card-ismeire-text: "#0f3a31"
  card-ismeire-accent: "#0f5e4e"
  card-ismeire-muted: "#3e5a53"
  stage-ismeire: "#1d6f5d"
  device-bezel: "#050608"
  device-screen: "#0b0c10"
  device-metal-dark: "#15161f"
  device-metal-mid: "#3b3e4d"
  device-metal-light: "#5b5f70"
  device-button: "#50535f"
  pc-frame: "#121317"
  pc-stand: "#4a4c52"
  pc-laptop-base: "#8a8d94"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(54px, 9.4vw, 136px)"
    fontWeight: 700
    lineHeight: 0.92
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(44px, 6vw, 84px)"
    fontWeight: 700
    lineHeight: 0.95
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(26px, 2.5vw, 34px)"
    fontWeight: 600
    lineHeight: 1.1
  body:
    fontFamily: "Barlow, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Barlow, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 600
rounded:
  tag-inner: "3px"
  tag: "6px"
  link-focus: "8px"
  button: "10px"
  logo: "13px"
  stage: "14px"
  card: "20px"
  device-screen: "52px (in device units, 1/418 of the phone width)"
spacing:
  gutter: "clamp(18px, 4vw, 40px)"
  container: "1240px"
components:
  button-light:
    backgroundColor: "{colors.algodao}"
    textColor: "{colors.anil}"
    rounded: "{rounded.button}"
    padding: "12px 24px"
    height: "50px"
  button-outline:
    textColor: "{colors.algodao}"
    rounded: "{rounded.button}"
    padding: "12px 24px"
    height: "50px"
---

# Design System: DC Solutions

Recorded on 2026-11-08 from the code of the v4 showcase (`src/css/v3.css` + `src/css/v4.css`), by scan. No owner interview: the descriptive language below is the Dev's reading of the incumbent system.

## Overview

"The tailor's tag": an indigo-and-cotton workshop look. Dashed stitch lines (`--pesponto: 2px dashed`), product tags hung on a line in the hero, condensed display type and plain cotton backgrounds. Each product card wears its own product's colors, while the frame around them stays indigo and cotton. Restrained everywhere except the hanging tags.

## Colors

- **Anil (#1f2d4d)** and **Anil fundo (#16203a)**: header, hero, contact and footer backgrounds; headings on light backgrounds.
- **Algodão (#f1f2ee)** and **Algodão 2 (#e4e6e1)**: page and section backgrounds, light buttons.
- **Grafite (#2b2f36)** body text, **Cinza (#59606b)** secondary text, **Névoa (#b9c2d3)** text on indigo, **Linha (#c9ced6)** stitch lines, **Celeste (#8fb4ff)** focus ring on dark.
- Each product card has its own background, accent and on-accent text (frontmatter `card-*` and `stage-*`), taken from the product's site.
- Device colors (`device-*`, `pc-*`) are only for the phone, monitor and laptop mockups.
- Product colors are used only inside each product's card and tag (IQNorth indigo, Fytform lime, H2HScout amber, Grimoire brown/gold, Ismeire deep green).

## Typography

Secondary steps used in the code besides the frontmatter roles: 13, 15, 16, 18, 22, 24, 28 and 30 px for labels, footer, nav, small headings and the FAQ marker.

Barlow Condensed (600/700) for display, headlines and titles; Barlow (400/600) for body and labels. Fallback faces with adjusted metrics (`Barlow Reserva Arial/Roboto`) keep the swap at CLS 0; do not remove them or change line heights without remeasuring.

## Layout

Container 1240px with fluid gutter. Product cards are two-column grids (text and stage) above 900px and stack below, stage first. Sections alternate cotton, cotton-2 and indigo. Mobile breakpoints at 900px, 640px and 600px.

## Elevation & Depth

Flat surfaces with tonal layering. Depth appears only in the device mockups: phones (`.cel`, 418x872 units with titanium band, bezel, side buttons, glass reflection, contact shadow and a product-colored glow) and the Grimoire monitor and laptop (`.pcs`).

## Shapes

Cards 20px radius, stages 14px, buttons 10px, tags 6px. Dashed inner outlines on tags and stitch-dashed separators are the recurring form.

## Components

- **Tag** (hero): product color, dashed inner outline, slight rotation, a pin on the line; swings in once on load (motion only with `prefers-reduced-motion: no-preference`).
- **Product card** (`.prod`): logo, domain, status chip (dashed outline), title, description, facts with a short colored dash, one product-colored button.
- **Phone pair** (`.dupla`): front phone straight and larger, back phone smaller, tilted -4°, partly behind it.
- **FAQ**: `<details>` with stitch separators and a +/− marker.

## Do's and Don'ts

- Do keep the logo "Anel", English only, and the indigo/cotton frame.
- Do use only real, public product screens with sample data.
- Don't add social proof, numbers or claims that the product Leads did not publish.
- Don't use inline `style` (CSP by hash); rebuild after any edit.
- Don't add motion without a `prefers-reduced-motion` guard, and keep CLS at 0.
