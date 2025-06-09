// @ts-check

import { LitElement, html, nothing } from 'lit'


export class MessageBox extends LitElement {

  static properties = {
    type: {type: String, attribute: 'type'},
    content: {type: String, attribute: 'content'},
    toolCalls: {type: Array, attribute: 'tool-calls'},
    streamingInProgress: {type: Boolean, state: true},
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
  }

  createRenderRoot() {
    this.innerHTML = ''
    return this
  }

  connectedCallback() {
    super.connectedCallback()
    if (!this.content && this.type === 'llm') {
      this.#stream()
    }
    const messageBoxes = document.querySelectorAll('message-box[type="llm"]')
    messageBoxes.forEach((messageBox, index) => {
      if (messageBox === this) {
        this.messageIndex = index + 1
      }
    })
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

          ${!this.streamingInProgress ? html`
            <button class="copy-button govuk-button govuk-!-margin-top-3 govuk-!-margin-bottom-0" @click="${this.#copyToClipboard}">
              Copy
              <span class="govuk-visually-hidden">response ${this.messageIndex}</span>
            </button>
          ` : nothing}

        ` : nothing}
      
      </div>
    `
  }


  #stream() {

    this.streamingInProgress = true
    
    // get message in view
    window.setTimeout(() => {
      this.scrollIntoView({
        block: 'start',
        behavior: 'instant'
      })
    }, 100);
    /** @type {HTMLElement | null} */(this.querySelector('.message-box'))?.focus()

    // setup SSE
    const source = new EventSource('/api/sse')
    source.onmessage = (evt) => {
      
      // parse response data
      /**
       * @type { {type?: 'tool' | 'content' | 'end', data?: any} }
       */
      let response = {}
      try {
        response = JSON.parse(evt.data)
      } catch (err) {
        console.log(err)
        return
      }

      // It's a tool
      if (response.type === 'tool') {
        this.toolCalls.push(response.data[0])

      // It's the text response
      } else if (response.type === 'content') {        
        this.content += response.data

      } else if (response.type === 'end') {
        source.close()
        this.streamingInProgress = false
      }

    }
    source.onerror = (err) => {
      console.log('SSE error:', err)
      source.close()
      this.streamingInProgress = false
      window.setTimeout(this.#stream, 500)
    }
    
  }


  #copyToClipboard() {
    /**
     * Copies the content inside the <markdown-converter> to the clipboard
     * @param {ClipboardEvent} evt 
     */
    const listener = (evt) => {
      evt.clipboardData?.setData("text/html", this.querySelector("markdown-converter")?.innerHTML.trim() || '');
      evt.clipboardData?.setData("text/plain", this.querySelector("markdown-converter")?.textContent?.trim() || '');
      evt.preventDefault();
    };
    document.addEventListener("copy", listener);
    document.execCommand("copy");
    document.removeEventListener("copy", listener);
  }

}

customElements.define("message-box", MessageBox)
