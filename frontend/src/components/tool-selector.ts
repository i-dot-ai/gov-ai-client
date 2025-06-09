// @ts-check


/**
 * Stores radio button selection in localStorage
 */
const ToolSelector = class extends HTMLElement {
  
  connectedCallback() {

    const preselectedTool = window.localStorage.getItem('selected-tool') || '';

    (this.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>).forEach((radioButton) => {
      
      radioButton.checked = preselectedTool === radioButton.value;
      
      radioButton.addEventListener('click', () => {
        window.localStorage.setItem('selected-tool', radioButton.value);
      });

    });
  }

}

customElements.define("tool-selector", ToolSelector);
