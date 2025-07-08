// @ts-check

import { LitElement, html, nothing } from 'lit'


export class MessageBox extends LitElement {

  static properties = {
    type: {type: String, attribute: 'type'},
    content: {type: String, attribute: 'content'},
    toolCalls: {type: Array, attribute: 'tool-calls'},
    isStreaming: {type: Boolean, attribute: 'is-streaming'},
    messageIndex: {type: Number, state: true},
    copied: {type: Boolean, state: true},
  }

  constructor() {
    super()
    /**
     * @type {'user'|'llm'}
     */
    this.type = this.type || 'user'
    /**
     * @type {string}
     */
    this.content = this.content || ''
    /**
     * @type { {name: string, args: []}[] }
     */
    this.toolCalls = this.toolCalls || []
    /**
     * @type {boolean}
     */
    this.isStreaming = false
    /**
     * @type {boolean}
     */
    this.copied = false
  }

  createRenderRoot() {
    this.innerHTML = ''
    return this
  }

  connectedCallback() {
    super.connectedCallback()
    
    const messageBoxes = document.querySelectorAll('message-box[type="llm"]')
    messageBoxes.forEach((messageBox, index) => {
      if (messageBox === this) {
        this.messageIndex = index
      }
    })
  }

  copyContent(event) {
    event.preventDefault()
    event.stopPropagation()
    
    const messageElement = this.querySelector(`#message-${this.messageIndex}`)
    if (messageElement) {
      const textContent = messageElement.textContent || messageElement.innerText
      navigator.clipboard.writeText(textContent).then(() => {
        // Show copied state
        this.copied = true
        // Reset after 2 seconds
        setTimeout(() => {
          this.copied = false
        }, 2000)
      }).catch(err => {
        console.error('Failed to copy content: ', err)
      })
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    super.attributeChangedCallback(name, oldValue, newValue)
    
    if (name === 'tool-calls' && newValue) {
      try {
        this.toolCalls = JSON.parse(newValue)
      } catch (e) {
        console.warn('Error parsing tool calls:', e)
        this.toolCalls = []
      }
    }
  }

  render() {
    return html`
      <div class=${'message-box message-box--' + this.type} tabindex="-1">
        ${this.type === 'user' ? html`
          <p class="govuk-body">${this.content}</p>
        ` : nothing}

        ${this.type === 'llm' ? html`
          <h2 class="govuk-visually-hidden">AI:</h2>
          
          ${this.toolCalls && this.toolCalls.length > 0 ? this.toolCalls.map(tool => html`
            <tool-info name=${tool.name} entries=${JSON.stringify(tool.args)}></tool-info>
          `) : nothing}

          ${this.content ? html`
            <markdown-converter id=${'message-' + this.messageIndex} class="govuk-body" content=${this.content}></markdown-converter>
          ` : nothing}

          ${!this.isStreaming && this.content ? html`
            <button type="button" class="clipboard-button ${this.copied ? 'copied' : ''}" @click=${this.copyContent} aria-label="${this.copied ? 'Copied!' : `Copy response ${this.messageIndex}`}">
              ${this.copied ? html`
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" fill="currentColor"/>
                </svg>
              ` : html`
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h1V2zm7 1V2H5v1h6zm2 1H3v10h10V4z" fill="currentColor"/>
                  <path d="M5 6h6v1H5V6zm0 2h6v1H5V8zm0 2h4v1H5v-1z" fill="currentColor"/>
                </svg>
              `}
            </button>
          ` : nothing}

        ` : nothing}
      
      </div>
    `
  }

}

customElements.define("message-box", MessageBox)
