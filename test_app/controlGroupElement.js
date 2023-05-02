import { css, LitElement, html, classMap } from "./lit-all.min.js";

export class ControlGroupElement extends LitElement {
  static properties = {
    heading: '',
    expanded: true,
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      /* border-top: 1px solid darkblue;
      border-bottom: 1px solid darkblue; */
      border-left: 1px solid darkblue;
      /* margin-left: 0.5em; */
      padding-left: 0.5em;
    }

    .title {
      display: block;
      margin-block-start: 1em;
      margin-block-end: 1em;
      margin-inline-start: 0px;
      margin-inline-end: 0px;
      font-weight: bold;
    }

    .depth0 {
      font-size: 1.17em;
    }

    .depth1 {
      font-size: 1em;
    }

    .depth2 {
      font-size: 0.83em;
    }

    .depth3 {
      font-size: 0.66em;
    }

    .controls {
      padding: 0;
    }

    .collapsed {
      display: none;
    }
  `;

  constructor(params = {}) {
    super();
    this.heading = params.heading;
    this.depth = 0;
    this.#controls = params.controls ? params.controls : new Array();
    if (params.expanded !== undefined) {
      this.expanded = params.expanded;
    } else {
      this.expanded = true;
    }
  }

  render() {
    const controlsClasses = { controls: true, collapsed: !this.expanded };
    const titleClasses = { title: true };
    titleClasses[`depth${this.depth}`] = true;
    return html`
      <div class=${classMap(titleClasses)} @click="${this.#toggleCollapseGroup}">
        ${this.expanded ? html`[-]` : html`[+]`} ${this.heading}
      </div>
      <div id="controls" class=${classMap(controlsClasses)}>
        ${this.#controls.map(control => {
          if (control instanceof ControlGroupElement) {
            control.SetGroupDepth(this.depth + 1);
          }
          return control;
        })}
        <slot></slot>
      </div>
    `;
  }

  AddControl(control) {
    this.#controls.push(control);
  }

  SetGroupDepth(depth) {
    this.depth = depth;
  }

  #toggleCollapseGroup() {
    this.expanded = !this.expanded;
  }

  SetExpanded(expanded) {
    for (const control of this.#controls) {
      if (control instanceof ControlGroupElement) {
        control.SetExpanded(expanded);
      }
    }
    this.expanded = expanded;
  }

  // Iterates over all of the controls and refreshes their state. Controls that
  // display properties of the Controlled Frame API, such as canGoBack(), are
  // updated to reflect their current state.
  RefreshState() {
    for (const control of this.#controls) {
      control.RefreshState();
    }
  }

  #controls;
}

customElements.define('control-group-element', ControlGroupElement);
