import { Log } from './common.js';
import { css, LitElement, html } from './lit-all.min.js';

export class ControlElement extends LitElement {
  static properties = {
    label: '',
    buttonText: '',
  };

  static styles = css`
    :host {
      display: grid;
      grid-template-columns: [label] 2fr [field] 3fr [button] 80px;
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

    .checkbox {
      display: inline;
    }

    input[type="checkbox"] {
      width: auto;
      text-align: left;
    }

     button {
      grid-column: button / span 1;
      justify-self: start;
      width: 100%;
    }
  `;

  constructor(params = {}) {
    super();
    this.label = params.label;
    this.fields = params.fields;
    this.buttonText = params.buttonText;
    this.#handler = params.handler;
    this.addEventListener('keydown', this.#onKeyDown.bind(this));
  }

  #onKeyDown(e) {
    if (e.code === 'Enter') {
      this.#handler(this);
    }
  }

  renderFields() {
    if (!this.fields) {
      return html`<label>${this.label}</label>`;
    }
    let fieldsTemplate = new Array();
    if (!!this.label) {
      fieldsTemplate.push(html`<h4>${this.label}</h4>`);
    }
    for (const field of this.fields) {
      let template = html`
        <label for=${field.name}>${field.name}</label>
        <input id=${field.name} type=${field.type} value=${field.value} />
      `;
      fieldsTemplate.push(template);
    }
    return fieldsTemplate;
  }

  maybeRenderButton() {
    if (!this.buttonText) {
      return html``;
    }

    return html`
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
    this.#handler(this);
  }

  GetFieldValue(fieldName) {
    return this.renderRoot.querySelector(`#${fieldName}`).value;
  }

  SetButtonHandler(handler) {
    this.#handler = handler;
  }

  #handler = null;
}

customElements.define('control-element', ControlElement);
