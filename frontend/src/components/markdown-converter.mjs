// @ts-check

import { LitElement, html } from 'lit'
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js'
import Showdown from 'showdown'


const MarkdownConverter = class extends LitElement {
  
  static properties = {
    content: {type: String},
  };

  /**
   * Ensures any links are properly rendered 
   * @param {string} input
   */
  #linkifyMarkdown(input) {

    // 1. Protect fenced code blocks
    /** @type {string[]} */
    const fencedBlocks = [];
    const noFenced = input.replace(/```[\s\S]*?```/g, match => {
      const token = `@@FENCED_${fencedBlocks.length}@@`;
      fencedBlocks.push(match);
      return token;
    });

    // 2. Protect inline code (`…`)
    /** @type {string[]} */
    const inlineCodes = [];
    const noInline = noFenced.replace(/`[^`]*`/g, match => {
      const token = `@@INLINE_${inlineCodes.length}@@`;
      inlineCodes.push(match);
      return token;
    });

    // 3. Protect existing Markdown links and images
    /** @type {string[]} */
    const mdLinks = [];
    const noLinks = noInline.replace(/(!?\[.*?\]\(.*?\))/g, match => {
      const token = `@@LINK_${mdLinks.length}@@`;
      mdLinks.push(match);
      return token;
    });

    // 4. Wrap any remaining http(s) URLs
    const linked = noLinks.replace(
      /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g,
      url => `[${url}](${url})`
    );

    // 5. Restore links/images, inline code, then fenced code
    const restoredLinks = linked.replace(/@@LINK_(\d+)@@/g, (_, i) => mdLinks[i]);
    const restoredInline = restoredLinks.replace(/@@INLINE_(\d+)@@/g, (_, i) => inlineCodes[i]);
    const restoredFenced = restoredInline.replace(/@@FENCED_(\d+)@@/g, (_, i) => fencedBlocks[i]);

    return restoredFenced;

  }

  /**
   * @param {string} markdown 
   * @returns {string}
   */
  convert(markdown) {

    // ensure any URLs are rendered as links
    markdown = this.#linkifyMarkdown(markdown);

    let converter = new Showdown.Converter({
      disableForced4SpacesIndentedSublists: true,
      headerLevelStart: 3,
      literalMidWordUnderscores: true, // to prevent links with underscores being displayed as italics
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
