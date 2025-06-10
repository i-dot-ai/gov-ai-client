// @ts-check


/**
 * Stores radio button selection in localStorage
 */
const ToolSelector = class extends HTMLElement {
  
  connectedCallback() {

    const preselectedPlugins = JSON.parse(window.localStorage.getItem('selected-plugins') || '[]');

    const inputs: NodeListOf<HTMLInputElement> = this.querySelectorAll('input[type="checkbox"]');

    inputs.forEach((input) => {

      input.checked = preselectedPlugins.includes(input.value);
      
      input.addEventListener('click', () => {
        const selectedInputs = [...inputs]
          .filter((input) => input.checked)
          .map((input) => input.value);
        window.localStorage.setItem(`selected-plugins`, JSON.stringify(selectedInputs));
      });

    });
  }

}

customElements.define("tool-selector", ToolSelector);
