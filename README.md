# NetFlux - High-Performance Network Traffic Generator

NetFlux is a modern, high-performance network traffic generator and speed test tool built with React and Vite. It leverages web workers to simulate high-concurrency traffic (up to 64 threads) directly from the browser, allowing for precise bandwidth testing and latency measurement across multiple nodes (Mobile, Telecom, Unicom, Global).

![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)

## 🚀 Key Features

*   **High Concurrency Engine**: Adjustable **1-64 Thread Worker Pool** for maximum bandwidth saturation.
*   **Multi-Node Load Balancing**: Automatically distributes requests across selected nodes to bypass browser per-domain limits.
*   **Real-time Visualization**:
    *   **ECharts Monitor**: High-frequency (1s) speed/latency chart with smooth animations.
    *   **Floating Stats Bar**: iOS-style dynamic header that auto-hides/collapses based on scroll & resize.
*   **Premium UI/UX**:
    *   **Vercel-style Aesthetics**: Morphing header icons, glassmorphism effects, and fluid transitions.
    *   **Smart Compression**: Header controls intelligently collapse from **Left-to-Right** (Threads -> Status -> Start -> Export) to prevent overlap.
    *   **Responsive**: Fully optimized for Desktop and Mobile (touch-friendly sliders).
*   **Traffic Mode**: Continuous download loops with `no-store` policies to prevent caching.

## 🛠 Tech Stack

*   **Core**: React 18, Vite 5
*   **Styling**: TailwindCSS 3.4, Shadcn/UI (Radix Primitives)
*   **Animation**: `tailwindcss-animate`, CSS Transitions (cubic-bezier)
*   **Charts**: Apache ECharts
*   **Icons**: Lucide React
*   **Font**: Inter (Google Fonts)

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/Jeffery2008/NetFlux.git
cd NetFlux

# Install dependencies (using pnpm is recommended)
pnpm install

# Start Development Server
pnpm dev
```

Build for Production:
```bash
pnpm build
```

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

**Why AGPL-3.0?**
This is the **strictest open-source license** designed to ensure that the project remains open and free forever.

*   **Copyleft**: If you modify this software and distribute it, you **MUST** release your modifications under the same AGPL-3.0 license.
*   **Network Use**: If you run a modified version of this software as a network service (e.g., on a website), you **MUST** provide the source code to users of that service.
*   **Transparency**: This prevents cloud providers or closed-source forks from exploiting the collaborative work without contributing back.

See [LICENSE](LICENSE) for the full text.

---

Designed with ❤️ by [Jeffery2008](https://github.com/Jeffery2008)
