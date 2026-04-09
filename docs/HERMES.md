# RuleSmith for Hermes Agent

**Prompt Template Integration**

---

## Overview

Hermes Agent is an autonomous AI agent framework. RuleSmith integrates with Hermes through its prompt template system and agent configuration.

---

## Prerequisites

1. **Hermes Agent** installed and configured
2. **Python 3.8+** (Hermes requirement)
3. **Hermes CLI** or **Hermes Server** running

---

## Installation

### Method 1: Hermes Template Integration

```bash
# Clone repository
git clone https://github.com/hariprs/rulesmith.git
cd rulesmith

# Copy prompts to Hermes templates directory
mkdir -p ~/.hermes/templates/self-improvement/
cp -r .claude/skills/rulesmith/prompts/ \
      ~/.hermes/templates/self-improvement/

# Copy state management
mkdir -p ~/.hermes/state/
cp -r .claude/skills/rulesmith/data/ ~/.hermes/state/self-improvement/
```

### Method 2: Agent Configuration

```bash
# Add to Hermes agent config
cat >> ~/.hermes/agents.yaml << 'EOF'
self_improvement:
  type: analysis
  description: "Analyze conversations and improve agent behavior"
  templates:
    - ~/.hermes/templates/self-improvement/
  state_file: ~/.hermes/state/self-improvement/state.json
  triggers:
    - "/rulesmith"
    - "/analyze"
    - "/learn"
EOF
```

### Method 3: Docker Integration

```dockerfile
# Dockerfile for Hermes with Self-Improvement
FROM hermes-agent:latest

# Copy self-improvement templates
COPY .claude/skills/rulesmith/prompts/ \
     /app/hermes/templates/self-improvement/

# Set up state directory
RUN mkdir -p /app/hermes/state/self-improvement

ENV HERMES_TEMPLATES_PATH=/app/hermes/templates
ENV HERMES_STATE_PATH=/app/hermes/state
```

---

## Hermes Configuration

### Agent Definition

Create `~/.hermes/agents/self-improvement.yaml`:

```yaml
name: self_improvement
version: 1.0.0
description: Analyze conversations and generate rule improvements

type: analysis
autonomous: false

templates:
  - path: templates/self-improvement/analyze-conversation.md
    name: analyze_conversation
    description: Scan conversation for correction patterns

  - path: templates/self-improvement/extract-patterns.md
    name: extract_patterns
    description: Extract recurring patterns from corrections

  - path: templates/self-improvement/generate-rules.md
    name: generate_rules
    description: Generate rule suggestions from patterns

state:
  file: ~/.hermes/state/self-improvement/state.json
  backup_dir: ~/.hermes/state/self-improvement/history/
  format: json

triggers:
  command:
    - /rulesmith
    - /analyze
    - /learn
  intent:
    - "analyze conversation"
    - "improve rules"
    - "learn from feedback"

output:
  format: markdown
  destination: console
  log_file: ~/.hermes/logs/self-improvement.log
```

### Prompt Template Adaptation

Hermes uses Jinja2-style templates. Adapt the prompts:

```jinja2
<!-- ~/.hermes/templates/self-improvement/analyze-conversation.j2 -->
## Conversation Analysis Task

You are analyzing a conversation between a user and an AI assistant
to identify correction patterns and learning opportunities.

### Context
- Platform: {{ platform }}
- Conversation Length: {{ message_count }} messages
- Timestamp: {{ timestamp }}

### Task

Scan through the conversation and identify:

1. **Corrections**: Places where the user rejected or modified your suggestions
   - Look for: "no", "not that", "don't", "too X"
   - Look for: alternative approaches the user preferred
   - Look for: "I prefer", "I want", "I need"

2. **Acceptances** (for contrast): Places where the user accepted your suggestions
   - Look for: "yes", "good", "perfect", "thanks"
   - Look for: applying suggestions without modification

3. **Patterns**: Recurring themes in the corrections
   - Group similar corrections
   - Count occurrences
   - Identify categories (code style, terminology, structure, etc.)

### Output Format

Provide your analysis as:

```
## Corrections Found: {{ count }}

### Pattern 1: {{ pattern_name }}
- Count: {{ frequency }}
- Example: "{{ quote }}"
- Suggested Rule: {{ rule }}

### Pattern 2: {{ pattern_name }}
...
```

{% if no_corrections %}
**No corrections detected** - conversation went smoothly!
{% endif %}
```

---

## Usage

### Hermes CLI

```bash
# Basic usage
hermes run self_improvement --input "Analyze our conversation"

# With conversation context
hermes run self_improvement \
  --conversation-file ~/.hermes/conversations/latest.json \
  --output ~/rules-update.md

# Interactive mode
hermes chat
> /rulesmith
```

### Hermes Server

```bash
# Start Hermes server with self-improvement agent
hermes server --agents self_improvement

# Call via API
curl -X POST http://localhost:8080/agents/self_improvement \
  -H "Content-Type: application/json" \
  -d '{"conversation": [...]}'
```

### Python API

```python
# self_improvement_hermes.py
from hermes import Agent, Template
from hermes.state import StateManager

class SelfImprovementAgent(Agent):
    """Hermes agent for conversation analysis and rule improvement."""

    def __init__(self):
        super().__init__("self_improvement")
        self.state = StateManager(
            state_file="~/.hermes/state/self-improvement/state.json"
        )
        self.templates = {
            "analyze": Template("analyze-conversation.j2"),
            "extract": Template("extract-patterns.j2"),
            "generate": Template("generate-rules.j2")
        }

    def analyze_conversation(self, conversation: list) -> dict:
        """Analyze conversation for correction patterns."""
        # Load analysis template
        template = self.templates["analyze"]
        prompt = template.render(
            platform="hermes",
            message_count=len(conversation),
            timestamp=datetime.now().isoformat()
        )

        # Run analysis
        result = self.llm.complete(prompt, context={
            "conversation": conversation
        })

        # Update state
        self.state.update({
            "last_analysis": datetime.now().isoformat(),
            "patterns_found": result.get("patterns", [])
        })

        return result

    def generate_rules(self, patterns: list) -> str:
        """Generate Hermes agent rules from patterns."""
        template = self.templates["generate"]
        return template.render(patterns=patterns)

# Register agent
agent = SelfImprovementAgent()
agent.register()
```

---

## Hermes Workflow Integration

### Agent Chain

```yaml
# ~/.hermes/workflows/conversation-learning.yaml
name: conversation_learning
description: "Learn from conversation to improve future interactions"

steps:
  - name: analyze
    agent: self_improvement
    action: analyze_conversation
    input:
      source: conversation

  - name: extract_patterns
    agent: self_improvement
    action: extract_patterns
    input:
      source: analyze.output

  - name: generate_rules
    agent: self_improvement
    action: generate_rules
    input:
      source: extract_patterns.output

  - name: apply_rules
    agent: system
    action: update_agent_config
    input:
      source: generate_rules.output

output:
  format: json
  destination: ~/.hermes/state/self-improvement/results.jsonl
```

### Scheduled Analysis

```yaml
# ~/.hermes/schedules/daily-analysis.yaml
name: daily_self_improvement
schedule: "0 18 * * *"  # 6 PM daily

workflow: conversation_learning

input:
  conversation_source: "daily_conversations"
  lookback_hours: 24

notification:
  on_complete: "email"
  address: user@example.com
```

---

## Advanced Features

### Multi-Agent Learning

```yaml
# ~/.hermes/agents/learning-coordinator.yaml
name: learning_coordinator
description: "Coordinate learning across multiple agents"

type: coordinator
sub_agents:
  - coder
  - reviewer
  - tester

learning_pipeline:
  - agent: self_improvement
    action: analyze_all_agent_conversations

  - agent: rule_generator
    action: create_unified_rules

  - agent: config_manager
    action: update_all_agent_configs
```

### Tool Integration

```python
# hermes_tools.py
from hermes import tool

@tool(name="improve_rules")
def improve_rules(conversation: list) -> dict:
    """Tool for improving agent rules based on conversation."""
    from self_improvement import SelfImprovementAgent

    agent = SelfImprovementAgent()
    analysis = agent.analyze_conversation(conversation)
    rules = agent.generate_rules(analysis["patterns"])

    return {
        "analysis": analysis,
        "rules": rules,
        "backup": agent.state.create_backup()
    }

# Register tool with Hermes
hermes.register_tool(improve_rules)
```

---

## Troubleshooting

### Agent Not Found

**Issue:** Hermes can't find self_improvement agent

**Solutions:**
```bash
# Verify agent is registered
hermes agents list | grep self_improvement

# Re-register agent
hermes agents register ~/.hermes/agents/self-improvement.yaml

# Check agent syntax
hermes agents validate self_improvement
```

### Template Errors

**Issue:** Jinja2 template rendering fails

**Solutions:**
```bash
# Validate template syntax
hermes templates validate analyze-conversation.j2

# Check template path
hermes templates list | grep self-improvement

# Reinstall templates
cp -r /path/to/rulesmith/.claude/skills/rulesmith/prompts/ \
      ~/.hermes/templates/self-improvement/
```

### State File Issues

**Issue:** State file corrupted or inaccessible

**Solutions:**
```bash
# Check state file permissions
ls -la ~/.hermes/state/self-improvement/

# Reset state if needed
hermes state reset self_improvement

# Or restore from backup
hermes state restore self_improvement \
  --from ~/.hermes/state/self-improvement/history/<timestamp>
```

---

## Tips & Best Practices

1. **Regular analysis** - Schedule daily or weekly learning runs
2. **Agent coordination** - Use learning coordinator for multi-agent setups
3. **Backup before changes** - Always create backups before updating rules
4. **Review generated rules** - Hermes is autonomous; review before applying
5. **Version control configs** - Track agent configuration changes in git

---

## Example Workflows

### Workflow 1: Standalone Analysis

```bash
# 1. Run analysis
hermes run self_improvement --analyze

# 2. Review results
cat ~/.hermes/state/self-improvement/results.jsonl

# 3. Apply rules
hermes run self_improvement --apply-rules
```

### Workflow 2: Multi-Agent Learning

```bash
# 1. Analyze all agent conversations
hermes run learning_coordinator

# 2. Generate unified rules
hermes run rule_generator --input all_agents

# 3. Update all agents
hermes run config_manager --apply-unified
```

### Workflow 3: Scheduled Learning

```bash
# 1. Schedule daily learning
hermes schedules add daily-learning \
  --schedule "0 18 * * *" \
  --workflow conversation-learning

# 2. Verify schedule
hermes schedules list

# 3. View results
cat ~/.hermes/logs/self-improvement.log
```

---

## FAQ

**Q: Can this work with multiple Hermes agents?**

A: Yes. Use the learning coordinator agent to aggregate patterns across all agents.

**Q: How do I reset learned patterns?**

A: Run `hermes state reset self_improvement` or delete the state file.

**Q: Can I export learned rules to other platforms?**

A: Yes. The generated rules are platform-agnostic Markdown. Copy them to any AI assistant.

**Q: Does this work with Hermes Pro?**

A: Yes. Works with all Hermes editions (Community, Pro, Enterprise).

---

**Platform Version:** Hermes Agent (Latest)
**Last Updated:** 2026-04-08
**Skill Version:** 1.0.0
