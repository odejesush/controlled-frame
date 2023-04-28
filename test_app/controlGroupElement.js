import { css, LitElement, html } from "./lit-all.min.js";

export class ControlGroupElement extends LitElement {
  static properties = {
    heading: '',
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .controls {
      border-bottom: 1px solid darkblue;
      padding: 0;
    }
  `;

  constructor(params = {}) {
    super();
    this.heading = params.heading;
    this.controls = params.controls ? params.controls : new Array();
  }

  render() {
    return html`
      <h3>${this.heading}</h3>
      <div id="controls" class="controls">
        ${this.controls.map(control => control)}
        <slot></slot>
      </div>
    `;
  }

  AddControl(control) {
    this.controls.push(control);
  }

  controls;
}

customElements.define('control-group-element', ControlGroupElement);