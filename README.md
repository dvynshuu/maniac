# Maniac OS

Maniac is a premium, high-performance **Personal Operating System** designed for individuals who demand absolute control over their knowledge, tasks, and data algorithms. It is built as a local-first platform, meaning your data stays strictly on your device for unmatched privacy and millisecond-level responsiveness.

Featuring the **Curator System V1.0**, Maniac combines a robust block-based text editor with dynamic dashboard abstractions to give you a true command center for your digital life.

## Features

- **Local-First Architecture**: Built entirely on IndexedDB (`Dexie.js`), Maniac boots instantly and operates beautifully without an internet connection. Zero server latency, full data ownership.
- **Block-Based Editor**: A fully custom, rich-text block editing experience. Type `/` to access a myriad of node types including Headings, Lists, Callouts, Code Blocks, Trackers, and Native Tables.
- **Maniac Dashboard**: A unified overview providing real-time local storage metrics, pinned priority nodes, active calendar integration mapping your creations, and an un-deletable Archive for reviewing off-loaded data.
- **Hyper-Aesthetic UI**: Carefully sculpted in the exclusive "Obsidian Kinetic" design language. Deep absolute blacks (`#0A0A0B`), highly polished dynamic hover states, glassmorphism hints, and vibrant cobalt (`#2E5BFF`) accents.
- **Drag & Drop Reordering**: Structure your thoughts exactly the way your brain works. Effortlessly grab any block and snap it elegantly into a new location.
- **Nested Infinity Structure**: Create pages within pages indefinitely. The sidebar adapts seamlessly to your expanding monolithic knowledge graph.

## Tech Stack

- **Framework**: React.js 18 + Vite
- **Styling**: Vanilla CSS with comprehensive CSS variable tokens
- **Icons**: Lucide React
- **Storage**: Dexie.js (IndexedDB Wrapper)
- **State Management**: Zustand
- **Routing**: React Router DOM

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/dvynshuu/maniac.git
   ```
2. Navigate to the local directory:
   ```bash
   cd maniac
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Boot the system:
   ```bash
   npm run dev
   ```

## Design Philosophy

The human brain does not organize information in neat little grids—it creates sprawling webs of interconnected nodes. Maniac is built on the philosophy of **Dynamic Modularity**. You are not constrained by predefined text boxes; every thought, tracker, and image is an independent block of data.

*Designed for the obsessives. Welcome to Maniac.*
