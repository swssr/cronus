# Cronus - Advanced Git Client

A modern, feature-rich Git client built with Tauri, React, and TypeScript. Cronus transforms complex Git operations into intuitive visual experiences, making version control accessible to both beginners and power users.

## 🚀 Key Features

### **Visual Git Workflow**
- **Interactive Git Graph**: Visual representation of commit history with branch visualization
- **Smart Commit Assistant**: AI-powered commit message suggestions and conventional commit support
- **Repository Analytics**: Comprehensive insights into repository health and activity patterns
- **Conflict Resolution**: Visual merge conflict resolver with side-by-side diff viewing

### **Advanced Git Operations**
- **Virtual Branches**: Create and manage virtual branches for experimental work
- **Interactive Rebase**: Visual rebase interface with drag-and-drop commit reordering
- **Cherry-pick Interface**: Easy cherry-picking with visual commit selection
- **Bisect Tool**: Visual bug hunting through commit history

### **Repository Intelligence**
- **Technical Debt Detection**: Automated identification of problematic files and patterns
- **Code Churn Analysis**: Track which files change most frequently
- **Author Contribution Insights**: Detailed analysis of team collaboration
- **Branch Activity Monitoring**: Visual representation of branch health and activity

### **Developer Experience**
- **Modern UI**: Beautiful dark/light theme with smooth animations
- **Keyboard Navigation**: Power user shortcuts for efficient workflow
- **Monaco Editor Integration**: Professional code viewing and editing experience
- **Cross-platform**: Native performance on Windows, macOS, and Linux

## 🎯 Value Proposition

### **For Beginners**
- **Learn Git Visually**: Complex Git concepts made simple through visual representation
- **Interactive Tutorials**: Guided tours explaining each Git operation
- **Smart Suggestions**: AI-powered recommendations for commit messages and workflows
- **Safety Features**: Visual confirmation before destructive operations

### **For Power Users**
- **Advanced Workflows**: Support for complex Git operations like interactive rebase
- **Repository Analytics**: Deep insights into codebase health and patterns
- **Performance**: Native Tauri performance with instant Git operations
- **Extensibility**: Plugin architecture for custom workflows

### **For Teams**
- **Collaboration Tools**: Visual conflict resolution and branch management
- **Code Review**: Integrated review tools with inline commenting
- **Workflow Templates**: Pre-configured workflows for different team structures
- **Analytics Dashboard**: Team activity and contribution insights

## 🛠 Technology Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Rust + Tauri for native performance
- **UI**: Framer Motion for smooth animations
- **Editor**: Monaco Editor for code viewing
- **Charts**: Custom D3.js visualizations

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- Rust toolchain
- Git installed on your system

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/cronus.git
   cd cronus
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Run in development mode**
   ```bash
   pnpm tauri dev
   ```

4. **Build for production**
   ```bash
   pnpm tauri build
   ```

## 📊 Features Overview

### **Git Graph Visualization**
- Interactive commit graph with branch visualization
- Multiple view modes: Graph, List, Timeline
- Commit selection and bulk operations
- Branch and tag visualization

### **Repository Analytics**
- **Overview**: Key metrics and activity patterns
- **Authors**: Top contributors and contribution analysis
- **Files**: Most changed files and code churn metrics
- **Branches**: Branch activity and health monitoring
- **Technical Debt**: Automated debt detection and recommendations

### **Conflict Resolution**
- Visual side-by-side conflict comparison
- Quick actions: Use Ours, Use Theirs, Merge Both
- Monaco Editor integration for manual resolution
- Progress tracking and conflict navigation

### **Smart Commit Assistant**
- AI-powered commit message suggestions
- Conventional commit format support
- File status visualization
- Staging and unstaging with visual feedback

## 🎨 UI/UX Highlights

### **Clean, Modern Design**
- Consistent design system with Tailwind CSS
- Dark/light theme support
- Smooth animations with Framer Motion
- Responsive layout for all screen sizes

### **Intuitive Navigation**
- Keyboard shortcuts for power users
- Contextual help and tooltips
- Progressive disclosure of advanced features
- Visual feedback for all operations

### **Performance Optimized**
- Native Tauri performance
- Virtual scrolling for large repositories
- Efficient Git operations
- Minimal memory footprint

## 🔧 Development

### **Project Structure**
```
src/
├── components/          # React components
│   ├── ui/            # Reusable UI components
│   └── ...            # Feature-specific components
├── views/             # Main view components
├── hooks/             # Custom React hooks
├── utils/             # Utility functions
├── types.ts           # TypeScript type definitions
└── App.tsx           # Main application component

src-tauri/
├── src/
│   ├── lib.rs        # Rust backend logic
│   └── main.rs       # Tauri entry point
└── Cargo.toml        # Rust dependencies
```

### **Adding New Features**
1. Define types in `src/types.ts`
2. Add Rust commands in `src-tauri/src/lib.rs`
3. Create utility functions in `src/utils/index.ts`
4. Build React components in `src/components/`
5. Integrate into main App component

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **Development Setup**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Tauri](https://tauri.app/) for cross-platform native apps
- UI components inspired by modern design systems
- Git operations powered by the Git command-line interface
- Icons from [Phosphor Icons](https://phosphoricons.com/)

---

**Cronus** - Making Git beautiful and accessible for everyone.
