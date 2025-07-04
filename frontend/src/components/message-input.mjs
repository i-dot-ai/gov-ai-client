// @ts-check
import Tribute from 'tributejs';


export class MessageInput extends HTMLElement {

  constructor() {
    super();
    this.textarea = this.querySelector('textarea');
    this.previousPrompt = '';
  }

  connectedCallback() {

    if (!this.textarea) {
      return;
    }

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

    this.#setupAutocomplete();
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


  #setupAutocomplete() {

    if (!this.textarea) {
      return;
    }

    this.textarea.setAttribute('aria-haspopup', 'listbox');
    this.textarea.setAttribute('aria-controls', 'tools-list');
    this.textarea.setAttribute('aria-expanded', 'false');

    // create live-region for screen-reader announcements
    let announcement = document.createElement('div');
    announcement.id = 'tool-autocomplete-live-region';
    announcement.classList.add('govuk-visually-hidden');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('role', 'status');
    this.appendChild(announcement);

    /**
     * One time setup for the autocomplete list
     * @param { HTMLUListElement } menu
     */
    const setupList = (menu) => {

      menu.setAttribute('role', 'listbox');
      menu.setAttribute('id', 'tools-list');

      const observerList = new MutationObserver(() => {
        menu.querySelectorAll('li').forEach((item) => {
          item.setAttribute('role', 'option');
          item.setAttribute('id', `tools-option-${item.dataset.index}`);
        });
      });
      observerList.observe(menu, { childList: true, subtree: true });

      const observerListItem = new MutationObserver(() => {
        const highlighted = menu.querySelector('.highlight');
        if (highlighted) {
          this.textarea?.setAttribute('aria-activedescendant', highlighted.id);
        }
      });
      observerListItem.observe(menu, { subtree: true, attributes: true, attributeFilter: ['class'] });

    };

    // when the autocomplete list shows
    this.textarea.addEventListener('tribute-active-true', () => {

      /** @type { HTMLUListElement | null } */
      let menu = document.querySelector('.tribute-container ul');
      if (menu && !menu.id) {
        setupList(menu);
      }

      this.textarea?.setAttribute('aria-expanded', 'true');
      window.setTimeout(() => {
        announcement.textContent = `Expanded'. ${menu?.querySelector('.highlight')?.textContent}, menu item`;
      }, 100);

    });

    // when the autocomplete list closes
    this.textarea.addEventListener('tribute-active-false', () => {
      this.textarea?.setAttribute('aria-expanded', 'false');
      this.textarea?.removeAttribute('aria-activedescendant');

      /*
       *The only way to get this to announce is to remove focus from textarea until announcement has finished
       *window.setTimeout(() => {
       *  announcement.textContent = 'Collapsed';
       *}, 100);
       */
    });

    /*
     *When an item is selected
     *The only way to get this to announce is to remove focus from textarea until announcement has finished
     *this.textarea.addEventListener('tribute-replaced', (evt) => {
     *  const insertedItem = evt.detail.item.original.value;
     *  this.textarea?.blur();
     *  announcement.textContent = 'Added';
     *  window.setTimeout(() => {
     *    this.textarea?.focus();
     *  }, 500);
     *});
     */

    // setup tribute
    this.tribute = new Tribute({
      values: (searchText, cb) => {
        const allTools = [...document.querySelectorAll('input[name="servers"]:checked ~ div .js-tool')].map((element) => {
          const toolName = element.textContent?.replace(':', '');
          return {
            key: `@${toolName}`, value: toolName,
          };
        });
        cb(allTools);
      },
      noMatchTemplate: () => {
        const message = 'No tools found - you can add more by selecting plugins';
        window.setTimeout(() => {
          announcement.textContent = message;
        }, 1000);
        return `<span>${message}</span>`;
      },
    });
    this.tribute.attach(this.textarea);

  }

}

customElements.define('message-input', MessageInput);
