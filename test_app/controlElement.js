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
      grid-template-columns: [label] auto [field] 3fr [button] 80px;
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
  }

  render() {
    return html`
      <label for="button">${this.label}</label>
      <button id="button" @click=${this.onBtnClick}>${this.buttonText}</button>
    `;
  }
  onBtnClick(e) {
    if (!this.#handler) {
      Log.err(`Handler for ${buttonText} is not set.`);
      return;
    }
    this.#handler();
  }

  SetButtonHandler(handler) {
    this.#handler = handler;
  }

  #handler = null;
}

customElements.define('control-element', ControlElement);
