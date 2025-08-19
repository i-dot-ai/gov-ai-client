// @ts-check


/**
 * Stores MCP Server selection in localStorage
 */
const ToolSelector = class extends HTMLElement {

  connectedCallback() {

    // Remember selected plugins and tools
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

    // Scroll down when "Select plugins" expanded
    const details = document.querySelector('details');
    details?.addEventListener('toggle', () => {
      if (details.open) {
        window.scrollTo(0, document.body.scrollHeight);
      }
    });

  }

};

customElements.define('tool-selector', ToolSelector);
