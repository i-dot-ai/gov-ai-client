// @ts-check

import { LitElement, html, nothing } from 'lit'


export class MessageBox extends LitElement {

  static properties = {
    type: {type: String, attribute: 'type'},
    content: {type: String, attribute: 'content'},
    toolCalls: {type: Array, attribute: 'tool-calls'},
    streamingInProgress: {type: Boolean, state: true},
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
  }

  createRenderRoot() {
    this.innerHTML = ''
    return this
  }

  connectedCallback() {
    super.connectedCallback()
    if (!this.content && this.type === 'llm') {
      this.#fetchMessage()
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
          
          ${this.toolCalls.map(tool => html`
            <tool-info name=${tool.name} entries=${JSON.stringify(tool.args)}></tool-info>
          `)}

          ${this.content ? html`
            <markdown-converter class="govuk-body" content=${this.content}></markdown-converter>
          ` : nothing}

          ${this.streamingInProgress ? html`
            <loading-message></loading-message>
          ` : nothing}

        ` : nothing}
      
      </div>
    `
  }

  async #fetchMessage() {
    this.streamingInProgress = true;
  
    // Ensure message is scrolled into view
    window.setTimeout(() => {
      this.scrollIntoView({ block: 'start', behavior: 'instant' });
    }, 100);
    /** @type {HTMLElement | null} */(this.querySelector('.message-box'))?.focus()

    try {
      const response = await fetch("/post-message", {
        method: "POST",
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: this.prompt
      });
      
      const data = await response.json();
  
      // Handle tool calls
      if (Array.isArray(data.toolCalls)) {
        this.toolCalls = data.toolCalls;
      }
  
      // Handle content
      if (typeof data.content === 'string') {
        this.content = data.content;
      }

    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      this.streamingInProgress = false;
    }
  }

}

customElements.define("message-box", MessageBox)
