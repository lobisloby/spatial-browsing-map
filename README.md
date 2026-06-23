
<div align="center">

# 🌐 Spatial Browsing Map

A powerful and lightweight browser extension that transforms your browsing history into an interactive visual tree map. Built with React, TypeScript, and Vite using Manifest V3.

<br />

![Spatial Browsing Map Banner](https://res.cloudinary.com/dgu10pv7t/image/upload/v1778184800/cover_ly9qji.png)

<br />

</div>

---

## 📌 Overview

**Spatial Browsing Map** turns your browsing history into a clear, interactive tree that shows how every page connects to the next. 

Every click, every new tab, and every search is mapped visually, allowing you to see the full picture of your web navigation. When you browse, the extension quietly builds a tree map in the background where each page is a node and each navigation is a connection.

---

## ✨ Features

- **Visual Tree Map** – An interactive, high-performance canvas displaying your browsing history as a connected tree. Pan, zoom, and click to explore your journeys.
- **Natural Branching** – Pages branch dynamically based on navigation context:
  - Clicking a link creates a child node.
  - Opening a new tab branches directly from the parent page you were viewing.
  - Revisiting a page highlights its existing node instead of cluttering your map with duplicates.
- **Live Recording** – Automatically tracks your browsing in the background. Pause and resume tracking anytime with a simple click on the toolbar button.
- **Powerful Search** – Instantly find any visited page by its title, URL, or domain. Search results focus and link directly to the matching node on your visual map.
- **Session Management** – Organize your browsing history into dedicated, separate sessions. Perfect for research projects, study sessions, or categorizing work tasks.
- **In-Depth Analytics** – Access visual stats for each session, including total pages visited, depth level, total branch splits, and unique domains.
- **Data Portability** – Export your custom sessions as structured JSON files for external backups, analysis, or sharing.
- **Light & Dark Mode** support for comfortable day or night research.

---

## 🛠️ Technologies Used

| Technology          | Purpose                                  |
|---------------------|------------------------------------------|
| React + TypeScript  | Frontend Framework & Type Safety         |
| Vite                | Ultra-fast Build Tool & Dev Server       |
| Tailwind CSS        | Modern, Responsive Utility-First Styling |
| Vis.js / Canvas API | Interactive Map Graph Rendering          |
| Chrome Extension API| Browser Storage, Tabs, and History API   |
| Manifest V3         | Modern, Secure Extension Standard        |

---

## 📁 Project Structure

```bash
spatial-browsing-map/
├── public/              # Static assets and icons
├── src/
│   ├── background/      # Service worker & history tracking logic
│   ├── components/      # Shared UI & Map visualization components
│   ├── content/         # Content scripts for page interaction
│   ├── hooks/           # Custom React hooks for data management
│   ├── options/         # Analytics dashboard & session manager
│   ├── popup/           # Extension toolbar popup UI
│   ├── store/           # State management (Zustand/Context)
│   └── utils/           # Tree data structures & helper functions
├── manifest.json        # Extension configuration
├── vite.config.ts       # Build configurations
├── tailwind.config.js   # Style configurations
└── package.json         # Dependencies and scripts
```

---

## 🚀 Getting Started

### Installation

**1. Install from Chrome Web Store (Recommended)**

You can install the extension directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/spatial-browsing-map/kmeiendoccejoojhehjbhjknchinhmjl?authuser=0&hl=en).

* **Load in Chrome**[cite: 1]:
  * Go to `chrome://extensions/`[cite: 1]
  * Enable **Developer mode**[cite: 1]
  * Click **Load unpacked**[cite: 1]
  * Select the `dist` folder[cite: 1]

---

## 📝 Future Improvements

- [ ] Interactive timeline playback of browsing sessions
- [ ] AI-powered auto-categorization of browsing branches
- [ ] Collaborative maps for shared research
- [ ] Integration with bookmarking tools (Notion, Obsidian)
- [ ] Dark mode optimized visualization themes

---

## 🤝 Contributing

Contributions and feature requests are welcome! Feel free to open an issue or submit a pull request.[cite: 1]

---

## 📄 License

MIT License

---

## 👤 Author

**Ayoub_Coder** Software Engineer | Building & Scaling Web Tools  
GitHub: [@lobisloby](https://github.com/lobisloby)

---

## ⭐ Show Your Support

If this tool helps you visualize your web journeys, give it a ⭐ on GitHub

---
this folder is just images for handle listing of extension 
<p align="center">
  Made with ❤️ for better web exploration
</p>
