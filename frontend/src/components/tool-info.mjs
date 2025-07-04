// @ts-check

import { LitElement, html } from 'lit';


const ToolInfo = class extends LitElement {

  static properties = {
    name: { type: String, attribute: 'name' },
    entries: { type: Object, attribute: 'entries' },
  };

  createRenderRoot() {
    this.innerHTML = '';
    return this;
  }

  render() {

    return html`
      <div class="govuk-summary-card">
        <div class="govuk-summary-card__title-wrapper">
          <h3 class="govuk-summary-card__title govuk-!-font-size-16"><span class="govuk-!-font-weight-regular">Calling: </span> ${this.name}</h3>
        </div>
        <div class="govuk-summary-card__content">
          <dl class="govuk-summary-list">
            ${this.entries ? html`
              ${Object.entries(this.entries).map(([key, value]) => html`
                <div class="govuk-summary-list__row">
                  <dt class="govuk-summary-list__key govuk-!-font-size-16">${key}</dt>
                  <dd class="govuk-summary-list__value govuk-!-font-size-16">${typeof value === 'string' ? value : JSON.stringify(value)}</dd>
                </div>
              `)}
            ` : ''}
          </dl>
        </div>
      </div>
    `;
  }

};

customElements.define('tool-info', ToolInfo);
