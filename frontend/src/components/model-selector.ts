// @ts-check


/**
 * Stores selected model in localStorage
 */
const ModelSelector = class extends HTMLElement {

  connectedCallback() {

    const select = this.querySelector('select');
    if (!select) {
      return;
    }

    const selectedTool = window.localStorage.getItem('selected-model');
    if (selectedTool) {
      select.value = selectedTool;
    }

    select.addEventListener('change', () => {
      window.localStorage.setItem('selected-model', select.value);
    });

  }

};

customElements.define('model-selector', ModelSelector);
