// @ts-check
import { LitElement, html } from 'lit';

export class LoadingMessage extends LitElement {

  createRenderRoot() {
    this.innerHTML = '';
    return this;
  }

  render() {
    return html`
      <div class="loading-ellipsis govuk-body govuk-!-margin-bottom-1">
        Loading
        <span aria-hidden="true">.</span>
        <span aria-hidden="true">.</span>
        <span aria-hidden="true">.</span>
      </div>
    `;
  }

}
customElements.define('loading-message', LoadingMessage);
