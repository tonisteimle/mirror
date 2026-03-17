/**
 * Chat Panel for Mirror Agent
 *
 * Chat interface for interacting with the AI assistant.
 */

import { MirrorAgent, type AgentEvent, type LLMCommand } from '../agent'

// ============================================
// TYPES
// ============================================

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
  commands?: LLMCommand[]
  timestamp: Date
  status?: 'sending' | 'streaming' | 'done' | 'error'
}

export interface ToolCall {
  id: string
  tool: string
  input: any
  result?: any
  status: 'pending' | 'running' | 'done' | 'error'
}

export interface ChatPanelConfig {
  container: HTMLElement
  agent: MirrorAgent
  onCommand?: (command: LLMCommand) => void
  onError?: (error: string) => void
}

// ============================================
// CHAT PANEL CLASS
// ============================================

export class ChatPanel {
  private container: HTMLElement
  private agent: MirrorAgent
  private messages: ChatMessage[] = []
  private isStreaming = false
  private onCommand?: (command: LLMCommand) => void
  private onError?: (error: string) => void

  // DOM elements
  private messagesContainer!: HTMLElement
  private inputElement!: HTMLTextAreaElement
  private sendButton!: HTMLButtonElement

  constructor(config: ChatPanelConfig) {
    this.container = config.container
    this.agent = config.agent
    this.onCommand = config.onCommand
    this.onError = config.onError

    this.render()
    this.setupEventListeners()
  }

  // ============================================
  // RENDERING
  // ============================================

  private render(): void {
    this.container.innerHTML = `
      <div class="chat-panel">
        <div class="chat-header">
          <span class="chat-title">AI Chat</span>
          <div class="chat-actions">
            <button class="chat-action" data-action="clear" title="Clear chat">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="chat-messages"></div>

        <div class="chat-suggestions">
        </div>

        <div class="chat-input-container">
          <textarea
            class="chat-input"
            placeholder="Ask anything... (Cmd+Enter to send)"
            rows="1"
          ></textarea>
          <button class="chat-send" title="Send (Cmd+Enter)">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 0 0-1.788 0l-7 14a1 1 0 0 0 1.169 1.409l5-1.429A1 1 0 0 0 9 15.571V11a1 1 0 1 1 2 0v4.571a1 1 0 0 0 .725.962l5 1.428a1 1 0 0 0 1.17-1.408l-7-14z"/>
            </svg>
          </button>
        </div>
      </div>
    `

    // Cache DOM elements
    this.messagesContainer = this.container.querySelector('.chat-messages')!
    this.inputElement = this.container.querySelector('.chat-input')!
    this.sendButton = this.container.querySelector('.chat-send')!

    // Render welcome message
    this.renderWelcome()
  }

  private renderWelcome(): void {
    this.messagesContainer.innerHTML = `
      <div class="chat-welcome">
        <div class="welcome-icon">✨</div>
        <div class="welcome-title">Mirror AI Assistant</div>
        <div class="welcome-text">
          I can help you create, modify, and improve your Mirror DSL code.
          Try asking me to create components, fix issues, or explain code.
        </div>
      </div>
    `
  }

  private renderMessages(): void {
    if (this.messages.length === 0) {
      this.renderWelcome()
      return
    }

    this.messagesContainer.innerHTML = this.messages
      .map(msg => this.renderMessage(msg))
      .join('')

    // Scroll to bottom
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight
  }

  private renderMessage(message: ChatMessage): string {
    const isUser = message.role === 'user'

    return `
      <div class="chat-message ${isUser ? 'user' : 'assistant'} ${message.status || ''}">
        <div class="message-header">
          <span class="message-role">${isUser ? 'You' : 'Mirror AI'}</span>
          <span class="message-time">${this.formatTime(message.timestamp)}</span>
        </div>
        <div class="message-content">${this.formatContent(message.content)}</div>
        ${message.toolCalls?.length ? this.renderToolCalls(message.toolCalls) : ''}
        ${message.commands?.length ? this.renderCommands(message.commands) : ''}
        ${message.status === 'streaming' ? '<div class="typing-indicator"><span></span><span></span><span></span></div>' : ''}
      </div>
    `
  }

  private renderToolCalls(toolCalls: ToolCall[]): string {
    return `
      <div class="tool-calls">
        ${toolCalls.map(tool => `
          <div class="tool-call ${tool.status}">
            <div class="tool-header">
              <span class="tool-icon">${this.getToolIcon(tool.tool)}</span>
              <span class="tool-name">${tool.tool}</span>
              <span class="tool-status">${this.getStatusIcon(tool.status)}</span>
            </div>
            ${tool.result ? `
              <details class="tool-details">
                <summary>Result</summary>
                <pre>${JSON.stringify(tool.result, null, 2)}</pre>
              </details>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `
  }

  private renderCommands(commands: LLMCommand[]): string {
    return `
      <div class="applied-commands">
        <span class="commands-label">Applied ${commands.length} change${commands.length > 1 ? 's' : ''}</span>
      </div>
    `
  }

  // ============================================
  // EVENT HANDLING
  // ============================================

  private setupEventListeners(): void {
    // Send button
    this.sendButton.addEventListener('click', () => this.sendMessage())

    // Input handling
    this.inputElement.addEventListener('keydown', (e) => {
      // Cmd/Ctrl+Enter to send
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        this.sendMessage()
      }
    })

    // Auto-resize textarea
    this.inputElement.addEventListener('input', () => {
      this.inputElement.style.height = 'auto'
      this.inputElement.style.height = Math.min(this.inputElement.scrollHeight, 150) + 'px'
    })

    // Clear button
    this.container.querySelector('[data-action="clear"]')?.addEventListener('click', () => {
      this.clearChat()
    })

    // Suggestions
    this.container.querySelectorAll('.suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = (btn as HTMLElement).dataset.prompt
        if (prompt) {
          this.inputElement.value = prompt
          this.sendMessage()
        }
      })
    })
  }

  // ============================================
  // MESSAGE HANDLING
  // ============================================

  async sendMessage(text?: string): Promise<void> {
    const messageText = text || this.inputElement.value.trim()
    if (!messageText || this.isStreaming) return

    // Clear input
    this.inputElement.value = ''
    this.inputElement.style.height = 'auto'

    // Add user message
    const userMessage: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
      status: 'done'
    }
    this.messages.push(userMessage)

    // Create assistant message placeholder
    const assistantMessage: ChatMessage = {
      id: this.generateId(),
      role: 'assistant',
      content: '',
      toolCalls: [],
      commands: [],
      timestamp: new Date(),
      status: 'streaming'
    }
    this.messages.push(assistantMessage)
    this.renderMessages()

    // Update UI state
    this.isStreaming = true
    this.updateStreamingState(true)

    try {
      // Run agent
      for await (const event of this.agent.run(messageText)) {
        this.handleAgentEvent(event, assistantMessage)
      }

      assistantMessage.status = 'done'
    } catch (error: any) {
      assistantMessage.content += `\n\nError: ${error.message}`
      assistantMessage.status = 'error'
      this.onError?.(error.message)
    } finally {
      this.isStreaming = false
      this.updateStreamingState(false)
      this.renderMessages()
    }
  }

  private handleAgentEvent(event: AgentEvent, message: ChatMessage): void {
    switch (event.type) {
      case 'text':
        if (event.content) {
          message.content += event.content
          this.renderMessages()
        }
        break

      case 'tool_start':
        message.toolCalls = message.toolCalls || []
        message.toolCalls.push({
          id: this.generateId(),
          tool: event.tool || '',
          input: event.input,
          status: 'running'
        })
        this.renderMessages()
        break

      case 'tool_end':
        if (message.toolCalls?.length) {
          const lastTool = message.toolCalls[message.toolCalls.length - 1]
          lastTool.result = event.result
          lastTool.status = event.result?.error ? 'error' : 'done'
          this.renderMessages()
        }
        break

      case 'command':
        if (event.command) {
          message.commands = message.commands || []
          message.commands.push(event.command)
          this.onCommand?.(event.command)
          this.renderMessages()
        }
        break

      case 'error':
        message.content += `\n\nError: ${event.error}`
        message.status = 'error'
        this.onError?.(event.error || 'Unknown error')
        this.renderMessages()
        break
    }
  }

  // ============================================
  // PUBLIC API
  // ============================================

  focus(): void {
    this.inputElement.focus()
  }

  clearChat(): void {
    this.messages = []
    this.renderMessages()
  }

  addSystemMessage(content: string): void {
    this.messages.push({
      id: this.generateId(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      status: 'done'
    })
    this.renderMessages()
  }

  // ============================================
  // HELPERS
  // ============================================

  private updateStreamingState(streaming: boolean): void {
    this.sendButton.disabled = streaming
    this.inputElement.disabled = streaming
    this.container.classList.toggle('streaming', streaming)
  }

  private formatContent(content: string): string {
    if (!content) return ''

    return content
      // Code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="$1">$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Line breaks
      .replace(/\n/g, '<br>')
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  private getToolIcon(tool: string): string {
    const icons: Record<string, string> = {
      get_code: '📄',
      get_element: '🔍',
      get_context: '📊',
      set_property: '✏️',
      remove_property: '🗑',
      add_child: '➕',
      delete_element: '🗑️',
      update_source: '📝',
      validate: '✓',
      wrap_in: '📦',
      move_element: '↔️',
      duplicate_element: '📋',
      replace_element: '🔄',
      batch_edit: '⚡',
      explain: '💡',
      find_issues: '🔎',
      suggest: '💭',
      compare_elements: '⚖️',
      code_stats: '📈',
      generate_component: '🎨',
      apply_pattern: '🧩',
      extract_component: '📤',
      generate_similar: '✨'
    }
    return icons[tool] || '🔧'
  }

  private getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      pending: '⏳',
      running: '⚡',
      done: '✓',
      error: '✗'
    }
    return icons[status] || ''
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9)
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createChatPanel(config: ChatPanelConfig): ChatPanel {
  return new ChatPanel(config)
}
