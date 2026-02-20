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
      // check the option exists, if not default to the first
      const availableOptions = Array.from(select.options);
      if (availableOptions.some((option) => option.value === selectedTool)) {
        select.value = selectedTool;
      } else {
        select.value = availableOptions[0].value;
      }
    }

    select.addEventListener('change', () => {
      window.localStorage.setItem('selected-model', select.value);
    });

  }

};

customElements.define('model-selector', ModelSelector);
