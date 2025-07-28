// @ts-check

import { LitElement, html } from 'lit';


/**
 * @property ref
 */
const ToolInfo = class extends LitElement {

  static properties = {
    name: { type: String, attribute: 'name' },
    server: { type: String, attribute: 'server' },
    entries: { type: Object, attribute: 'entries' },
    ref: { type: String, attribute: 'ref' },
    inUse: { type: String, attribute: 'in-use' },
  };

  createRenderRoot() {
    this.innerHTML = '';
    return this;
  }

  render() {

    return html`
      <button class="govuk-!-padding-0" aria-expanded="false" aria-controls="tool-${this.ref}" @click=${this.#toggle} type="button">
        <span class="tool-info__icon" aria-hidden="true">
          ${this.server[0].toUpperCase()}
          <img src="${'/server-logos/' + this.server.toLowerCase().replaceAll(' ', '_') + '.png'}" alt=""/>
        </span>
        <span class="tool-info__text" aria-live="polite">
          <span class="govuk-body-xs govuk-!-margin-bottom-0">${this.inUse === 'true' ? 'Using' : 'View'} the <strong>${this.name}</strong> tool</span>
          <span class="govuk-body-xs govuk-!-margin-bottom-0">From the <strong>${this.server}</strong> plugin</span>
        </span>
      </button>
      <div class="tool-info__expandable" id="tool-${this.ref}">
        <table class="govuk-!-margin-top-2">
          <thead class="govuk-visually-hidden">
            <tr>
              <th>Property</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            ${this.entries ? html`
              ${Object.entries(this.entries).map(([key, value]) => html`
                <tr>
                  <td class="govuk-body-xs govuk-!-padding-top-2 govuk-!-padding-bottom-2">${key}:</td>
                  <td class="govuk-body-xs govuk-!-padding-top-2 govuk-!-padding-bottom-2">${typeof value === 'string' ? value : JSON.stringify(value)}</td>
                </tr>
              `)}
            ` : ''}
          </tbody>
        </table>
      </div>
    `;
  }

  #toggle() {
    const btn = this.querySelector('button');
    if (btn?.getAttribute('aria-expanded') === 'false') {
      btn.setAttribute('aria-expanded', 'true');
    } else {
      btn?.setAttribute('aria-expanded', 'false');
    }
  }

};

customElements.define('tool-info', ToolInfo);
