// @ts-check

import { LitElement, html, nothing } from 'lit'


export class MessageBox extends LitElement {

  static properties = {
    type: {type: String, attribute: 'type'},
    content: {type: String, attribute: 'content'},
    toolCalls: {type: Array, attribute: 'tool-calls'},
    isStreaming: {type: Boolean, attribute: 'is-streaming'},
    messageIndex: {type: Number, state: true},
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
          <h2 class="govuk-heading-s govuk-!-font-size-16 govuk-!-margin-bottom-1">You:</h2>
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
            <copy-button class="govuk-!-margin-top-2" copy=${'message-' + this.messageIndex}>
              Copy
              <span class="govuk-visually-hidden">response ${this.messageIndex}</span>
            </copy-button>
          ` : nothing}

        ` : nothing}
      
      </div>
    `
  }

}

customElements.define("message-box", MessageBox)
