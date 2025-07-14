// @ts-check


/**
 * Stores MCP Server selection in localStorage
 */
const ToolSelector = class extends HTMLElement {

  connectedCallback() {

    const localStorageStr = window.localStorage.getItem('selected-tools');
    const preselectedTools = JSON.parse(localStorageStr || '[]');

    const inputs: NodeListOf<HTMLInputElement> = this.querySelectorAll('input[type="checkbox"]');

    inputs.forEach((input) => {

      input.checked = !localStorageStr || preselectedTools.includes(input.value);

      input.addEventListener('click', () => {
        const selectedInputs = [...inputs]
          .filter((input) => input.checked)
          .map((input) => input.value);
        window.localStorage.setItem('selected-tools', JSON.stringify(selectedInputs));
      });

    });
  }

};

customElements.define('tool-selector', ToolSelector);
