// @ts-check

import { LitElement, html } from 'lit'
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js'
import Showdown from 'showdown'


const MarkdownConverter = class extends LitElement {
  
  static properties = {
    content: {type: String},
  };

  /**
   * @param {string} markdown 
   * @returns {string}
   */
  convert(markdown) {
    let converter = new Showdown.Converter({
      disableForced4SpacesIndentedSublists: true,
      headerLevelStart: 3,
      tables: true,
    });
    return converter.makeHtml(markdown);
  }

  createRenderRoot() {
    this.innerHTML = '';
    return this;
  }

  render() {
    return html`
      <div>
        ${unsafeHTML(this.convert(this.content))}
      </div>
    `;
  }

}

customElements.define("markdown-converter", MarkdownConverter);


/*
export class MarkdownConverter extends HTMLElement {

  update(markdown) {
    let converter = new showdown.Converter({
      disableForced4SpacesIndentedSublists: true,
      headerLevelStart: 3,
      tables: true,
    });
    // escape any user-submitted HTML
    if (this.dataset.role === "user") {
      // escape the HTML tags
      markdown = markdown.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      // mark them as code - flaky (because sometimes the HTML will be incomplete) so commented out for now
      //markdown = markdown.replace(/&lt;([\w-]+)&gt;/g, '<span class="code">&lt;$1&gt;</span>');
    }
    this.innerHTML = converter.makeHtml(markdown);
  }

  connectedCallback() {
    this.update(this.textContent || "");
  }
}
customElements.define("markdown-converter", MarkdownConverter);
*/
