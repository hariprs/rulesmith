# Platform Documentation Index

**RuleSmith - Platform-Specific Guides**

This directory contains installation and usage guides for using RuleSmith with various AI coding platforms.

---

## Quick Reference

| Platform | Integration Type | Difficulty | Features |
|----------|------------------|------------|----------|
| [Claude Code](./CLAUDE-CODE.md) | Native Skill | ⭐ Easy | Full feature access |
| [Cursor IDE](./CURSOR.md) | .cursorrules | ⭐ Easy | Native file format |
| [GitHub Copilot](./COPILOT.md) | Custom Instructions | ⭐⭐ Medium | Markdown format |
| [VS Code + Copilot](./VSCODE-COPILOT.md) | Workspace Settings | ⭐⭐ Medium | Multi-root support |
| [Qwen Code](./QWEN-CODE.md) | Adapter Script | ⭐⭐⭐ Advanced | API integration |
| [OpenCLAW](./OPENCLAW.md) | Custom Config | ⭐⭐ Medium | Agent-based |
| [Hermes Agent](./HERMES.md) | Template System | ⭐⭐⭐ Advanced | Multi-agent learning |

---

## Platform Comparison

### Native Support Platforms
These platforms have built-in support for RuleSmith:

| Platform | Command | State Management | Backup |
|----------|---------|------------------|--------|
| Claude Code | `/improve-rules` | ✅ Full | ✅ Auto |
| Cursor IDE | `/improve-rules` | ✅ Full | ✅ Auto |

### Adapter-Based Platforms
These platforms use adapter scripts for integration:

| Platform | Adapter Language | Configuration |
|----------|------------------|--------------|
| Qwen Code | Python | ~/.qwen/config.py |
| OpenCLAW | YAML/JSON | ~/.openclaw/config.json |
| Hermes Agent | Python/Jinja2 | ~/.hermes/agents.yaml |

---

## Choosing Your Platform

### For Beginners
Start with **Claude Code** or **Cursor IDE** for the easiest setup experience.

### For VS Code Users
Use **VS Code + GitHub Copilot** for seamless integration with your existing workflow.

### For Advanced Users
Explore **Qwen Code**, **OpenCLAW**, or **Hermes Agent** for more control and customization options.

---

## Common Features Across Platforms

| Feature | Description |
|---------|-------------|
| **Conversation Analysis** | Identifies correction patterns in conversations |
| **Rule Generation** | Creates platform-specific rule suggestions |
| **State Persistence** | Tracks patterns across sessions |
| **Backup & Restore** | Timestamped backups before changes |
| **Privacy First** | 100% local, no external APIs |
| **Comprehensive Testing** | 500+ tests with 98.8% pass rate |

---

## Installation Guide

📖 **[Start here: Complete Installation Guide](./INSTALLATION-GUIDE.md)**

---

## Individual Platform Guides

### Claude Code
- [Full Guide](./CLAUDE-CODE.md)
- **Integration:** Native skill system
- **Setup Time:** ~5 minutes
- **Features:** 100% feature access

### Cursor IDE
- [Full Guide](./CURSOR.md)
- **Integration:** `.cursorrules` file
- **Setup Time:** ~5 minutes
- **Features:** Native formatting, project-level rules

### GitHub Copilot
- [Full Guide](./COPILOT.md)
- **Integration:** Custom instructions
- **Setup Time:** ~10 minutes
- **Features:** Markdown format, organization rules

### VS Code + Copilot
- [Full Guide](./VSCODE-COPILOT.md)
- **Integration:** Workspace settings
- **Setup Time:** ~15 minutes
- **Features:** Multi-root workspace support

### Qwen Code
- [Full Guide](./QWEN-CODE.md)
- **Integration:** Python adapter
- **Setup Time:** ~20 minutes
- **Features:** API access, custom prompts

### OpenCLAW
- [Full Guide](./OPENCLAW.md)
- **Integration:** Custom config
- **Setup Time:** ~15 minutes
- **Features:** Agent-based, CLI support

### Hermes Agent
- [Full Guide](./HERMES.md)
- **Integration:** Template system
- **Setup Time:** ~30 minutes
- **Features:** Multi-agent learning, scheduled analysis

---

## Platform Support Matrix

| Feature | Claude | Cursor | Copilot | VS Code | Qwen | OpenCLAW | Hermes |
|---------|--------|--------|---------|---------|------|----------|--------|
| Slash Commands | ✅ | ✅ | ⚠️* | ⚠️* | ⚠️* | ✅ | ✅ |
| Auto-Detection | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| State Management | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Backup/Restore | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Project Rules | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Team Sharing | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multi-Agent | - | - | - | - | - | - | ✅ |

*Requires adapter script or manual invocation

---

## Troubleshooting

### Common Issues Across Platforms

| Issue | Solution |
|-------|----------|
| Skill not found | Verify installation path |
| Permissions error | Run `chmod 600 data/*` |
| State file corrupt | Restore from backup |
| Rules not applying | Check platform-specific format |

For platform-specific troubleshooting, see individual guides.

---

## Contributing

Want to add support for a new platform?

1. Create a new guide in this directory
2. Follow the existing guide template
3. Test thoroughly with the target platform
4. Submit a pull request

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.

---

## Updates

| Date | Platform | Change |
|------|----------|--------|
| 2026-04-08 | All | Initial documentation release |
| 2026-04-08 | Hermes | Added multi-agent learning guide |

---

**Last Updated:** 2026-04-08
**Documentation Version:** 1.0.0
