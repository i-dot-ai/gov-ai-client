// @ts-check
import accessibleAutocomplete from '../components/accessible-autocomplete/wrapper.jsx';


export class MessageInput extends HTMLElement {

  constructor() {
    super();

    // setup autocomplete
    const allTools = [...document.querySelectorAll('.js-tool')].map(element => `@${element.textContent?.replace(':', '')}`);
    accessibleAutocomplete({
      element: this.querySelector('#prompt-container'),
      id: 'prompt',
      source: allTools,
      inputClasses: 'govuk-textarea govuk-!-margin-bottom-3 prompt-box__textarea',
      name: 'prompt',
      required: true,
      showNoOptionsFound: false,
    });

    this.textarea = this.querySelector('textarea');
    this.previousPrompt = '';
  }

  connectedCallback() {

    if (!this.textarea) {
      return;
    }

    // only show prompt box if '@' used
    /** @type {HTMLElement | null} */
    /*
    const suggestions = document.querySelector('#prompt__listbox');
    if (suggestions) {
      suggestions.style.display = 'none';
      this.textarea.addEventListener('keyup', () => {
        if (!this.textarea) {
          return;
        }
        const showSuggestions = this.textarea.value.charAt(0) === '@'
        suggestions.style.display = showSuggestions ? 'block' : 'none';
        if (!showSuggestions) {
          this.textarea.setAttribute('aria-expanded', 'false');
        }
      });
    }
    */

    // Submit form on enter-key press (providing shift isn't being pressed)
    this.textarea.addEventListener('keypress', (evt) => {
      if (evt.key === 'Enter' && !evt.shiftKey) {
        evt.preventDefault();
        if (this.textarea?.value.trim()) {
          this.closest('form')?.requestSubmit();
        }
      }
    });

    // expand textarea as user adds lines
    this.textarea.addEventListener('input', () => {
      this.#adjustHeight();
    });
  }

  #adjustHeight = () => {
    if (!this.textarea) {
      return;
    }
    this.textarea.style.height = 'auto';
    this.textarea.style.height = `${this.textarea.scrollHeight}px`;
  };

  /**
   * Returns the current message
   * @returns string
   */
  getValue = () => {
    return this.textarea?.value?.trim() || '';
  };

  /**
   * Clears the message and resets to starting height
   */
  reset = () => {
    if (!this.textarea) {
      return;
    }
    this.previousPrompt = this.textarea.value;
    this.textarea.value = '';
    this.#adjustHeight();
  };

}

customElements.define('message-input', MessageInput);
