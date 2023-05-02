import { Log } from './common.js';
import { css, LitElement, html } from './lit-all.min.js';

/**
 * @typedef Field
 * @property {string} name - The name of the field to apply to its label.
 * @property {string} type - The input field type to use.
 * @property {(string|boolean|number)} value - The value to set on the field.
 */

/**
 * @callback ControlCallback
 * @param {ControlElement} controlEl - The element containing the control.
 */

/**
 * @typedef ControlElementParams
 * @property {string} name - The name of the controls in this element.
 * @property {Field[]} fields - The parameter fields for this control.
 * @property {boolean} isEventControl - Specifies whether the input fields
 *     correspond to an event API. If it is, the button is not rendered since
 *     the event handler should call GetFieldValue() to read the fields.
 * @property {string} buttonText - The text to place inside the submit button.
 * @property {ControlCallback} handler - The function to run on submit.
 */

export class ControlElement extends LitElement {
  static properties = {
    id: '',
    label: '',
    buttonText: '',
  };

  static styles = css`
    :host {
      display: grid;
      grid-template-columns: [label] 10em [field] auto [button] 80px;
      column-gap: 0.5em;
      row-gap: 0.5em;
      padding: 0;
      margin: 0.5em;
    }

     p,
     h1,
     h2,
     h3,
     h4,
     h5,
     h6 {
      grid-column: label / end;
      justify-items: stretch;
    }

     label {
      grid-column: label / span 1;
      justify-items: stretch;
      padding-right: 5px;
      font-family: monospace;
      tab-size: 2;
      white-space: pre;
      overflow-wrap: break-word;
    }

     input,
     select,
     img,
     div {
      grid-column: field / span 1;
      justify-items: left;
    }

     div {
      white-space: pre;
    }

     input[type='text'],
     input[type='textarea'] {
      width: 100%;
    }

    input[type="checkbox"] {
      width: fit-content;
      text-align: left;
    }

    button {
      grid-column: button / span 1;
      justify-self: start;
      width: 100%;
    }
  `;

  /**
   * Creates a ControlElement with the options given in |params|.
   * @param {ControlElementParams} params - The options to use for initializing
   *     this class.
   */
  constructor(params = {}) {
    super();
    let idPrefix = '';
    // If params.name is omitted, use the name of the first field for the id.
    if (params.name === undefined) {
      if (params.fields.length === 0 || params.fields[0].name === undefined) {
        throw('ControlElement: Name or field name must be provided.');
      }
      idPrefix = params.fields[0].name;
    }
    this.id = idPrefix + '_control';
    this.name = params.name;
    this.fields = params.fields ? params.fields : new Array();
    this.isEventControl = params.isEventControl !== undefined ? params.isEventControl : false;
    this.buttonText = params.buttonText ? params.buttonText : 'Call';
    this.#handler = params.handler;
    this.addEventListener('keydown', this.#onKeyDown.bind(this));
  }

  #onKeyDown(e) {
    if (e.code === 'Enter') {
      this.#handler(this);
    }
  }

  renderField(field) {
    const id = field.id !== undefined ? field.id : field.name;
    let template = [
      html`<label for=${field.name}>${field.name}</label>`,
    ];
    // TODO: Add a custom element where multiple text boxes can be added for
    // APIs such as ContextMenusCreateProperties.documentUrlPatterns.
    // https://developer.chrome.com/docs/extensions/reference/webviewTag/#type-ContextMenuUpdateProperties
    switch (field.type) {
      case 'checkbox':
        template.push(html`
          <input id=${id} type=${field.type} ?checked=${field.checked} /> `);
        break;
      case 'select':
        template.push(html`
          <select id=${id} ?multiple=${field.multiple}>
            ${field.options.map(option =>
          html`<option value=${option}>${option}</option>`
        )}</select>`);
        break;
      case 'div':
        template.push(html`<div id=${id}></div>`);
        break;
      default:
        template.push(html`
          <input id=${id} type=${field.type}
              value=${field.value ? field.value : ''} /> `);
        break;
    }
    return template;
  }

  renderFields() {
    let fieldsTemplate = new Array();
    for (const field of this.fields) {
      fieldsTemplate.push(...this.renderField(field));
    }
    return fieldsTemplate;
  }

  maybeRenderButton() {
    if (this.isEventControl || !this.#handler) {
      return html``;
    }

    const buttonLabel =
      !!this.name ? html`<label>${this.name}</label>` : html``;
    return html`
      ${buttonLabel}
      <button id="button" @click=${this.onBtnClick}>
        ${this.buttonText}
      </button>
    `;
  }

  render() {
    return html`
      ${this.renderFields()}
      ${this.maybeRenderButton()}
    `;
  }

  onBtnClick(e) {
    if (!this.#handler) {
      Log.err(`Handler for ${buttonText} is not set.`);
      return;
    }
    this.Submit();
  }

  async GetFieldValue(fieldName) {
    if (!this.renderRoot) {
      await this.updateComplete;
    }
    const field = this.renderRoot.querySelector(`#${fieldName}`);
    switch (field.type) {
      case 'checkbox':
        return field.checked;
      case 'select-multiple':
        return field.options;
      default:
        return field.value;
    }
  }

  UpdateFieldValue(fieldName, value) {
    const updateValue = () => {
      const field = this.renderRoot.querySelector(`#${fieldName}`);
      switch (field.type) {
        case 'checkbox':
          field.checked = value;
          return;
        case 'div':
          field.innerText = value;
          return;
        case 'select':
          // TODO if needed.
          return;
        default:
          field.value = value;
      }
    };
    if (!this.renderRoot) {
      this.updateComplete.then(updateValue);
      return;
    }
    updateValue();
  }

  SetButtonHandler(handler) {
    this.#handler = handler;
  }
  Submit() {
    this.#handler(this);
  }

  #handler = null;
}

customElements.define('control-element', ControlElement);
