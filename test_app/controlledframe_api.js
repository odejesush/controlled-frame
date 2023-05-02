import { $, Log, textareaExpand, textareaOninputHandler, toggleHide } from './common.js';
import { ControlElement } from './controlElement.js';
import { ControlGroupElement } from './controlGroupElement.js';

const DEFAULT_ATTRIBUTES = {
  id: 'view',
  partition: 'persist:myapp',
  allowtransparency: false,
  autosize: true,
  name: 'controlled-frame-view',
  src: 'https://google.com',
};

function prependHTTPSProtocol(str) {
  if (!str.startsWith('http://') && !str.startsWith('https://')) {
    return 'https://' + str;
  }
  return str;
}

function isValidUrl(str) {
  let url;
  try {
    url = new URL(str);
  } catch (_) {
    return false;
  }

  return url.protocol === 'http:' || url.protocol === 'https:';
}

class ControlledFrameController {
  constructor() {
    this.#urlParams = new URLSearchParams(window.location.search);
    this.controlledFrame = $('#view');
    this.controlGroups = new Array();
    this.CreateControlledFrameTag();
  }

  // Creates a <controlledframe> tag and appends it to its container div. If a
  // <controlledframe> element already exists, it is destroyed and re-created.
  CreateControlledFrameTag() {
    // Re-create the <controlledframe> tag if it already exists.
    if (this.controlledFrame) {
      this.controlledFrame.remove();
      Log.info('Current <controlledframe> tag destroyed.');
    }
    if (typeof ControlledFrame === undefined) {
      Log.err('The Controlled Frame API is not available.');
    }
    this.controlledFrame = document.createElement('ControlledFrame');
    $('#controlledframe_container').appendChild(this.controlledFrame);
    this.#initControlledFrameAttributes();
    this.#initControlledFrameAPIControls();
  }

  NavigateControlledFrame(url) {
    if (!isValidUrl(url)) {
      Log.err(`Invalid URL for src: ${url}`);
      return;
    }
    this.controlledFrame.src = url;
  }

  // Fetches the current state of the Controlled Frame API and displays the
  // values in their respective input fields.
  RefreshState() {
    for (const group of this.controlGroups) {
      if (group !== undefined && group.RefreshState !== undefined) {
        group.RefreshState();
      }
    }
    this.#getUserAgent();
    this.#getAudioState();
    this.#getProcessId();
    this.#getZoom();
    this.#getZoomMode();
    this.#isAudioMuted();
    this.#isSpatialNavigationEnabled();
    this.#isUserAgentOverridden();

    // Set current time for ClearDataOptions
    let now = new Date();
    $('#clear_data_options_since_in').value = now.getTime();

    this.#refreshAddedContentScripts();
  }

  // Sets the attribute value if it was specified in the URL parameters or in
  // the attribute's input element. If it was not specified, sets the provided
  // default value.
  #getAttributeValue(name, inputEl, defaultValue) {
    let param = this.#urlParams.get(name);
    if (param && param.length !== 0) {
      inputEl.value = param;
      return;
    }
    if (inputEl.value.length !== 0) {
      return;
    }
    inputEl.value = defaultValue;
  }

  // Initializes the <controlledframe> tag attributes with default values.
  #initControlledFrameAttributes() {
    const controls = [
      new ControlElement({
        fields: [{
          name: 'allowtransparency',
          type: 'checkbox',
          checked: DEFAULT_ATTRIBUTES.allowtransparency,
          refreshValue: () => this.controlledFrame.allowtransparency
        }],
        buttonText: 'Set',
        handler: this.#setAllowtransparency.bind(this)
      }),
      new ControlElement({
        fields: [{
          name: 'autosize',
          type: 'checkbox',
          checked: DEFAULT_ATTRIBUTES.autosize,
          refreshValue: () => this.controlledFrame.autosize
        }],
        buttonText: 'Set',
        handler: this.#setAutosize.bind(this)
      }),
      new ControlElement({
        fields: [{
          name: 'name',
          type: 'text',
          value: DEFAULT_ATTRIBUTES.name,
          refreshValue: () => this.controlledFrame.name
        }],
        buttonText: 'Set',
        handler: this.#setName.bind(this)
      }),
      new ControlElement({
        fields: [{
          name: 'partition',
          type: 'text',
          value: DEFAULT_ATTRIBUTES.partition,
          refreshValue: () => this.controlledFrame.partition
        }],
        buttonText: 'Set',
        handler: this.#setPartition.bind(this)
      }),
      new ControlElement({
        fields: [{
          name: 'src',
          type: 'text',
          value: DEFAULT_ATTRIBUTES.src,
          refreshValue: () => this.controlledFrame.src
        }],
        buttonText: 'Set',
        handler: this.#setSrc.bind(this)
      }),
    ];
    const controlGroupElement = new ControlGroupElement({
      heading: 'Tag Attributes',
      controls: controls
    });
    this.controlGroups.push(controlGroupElement);
    $('#control-div').append(controlGroupElement)

    for (const control of controls) {
      control.Submit();
    }
  }

  // Initializes the various inputs and buttons that will be used to test the
  // Controlled Frame API.
  #initControlledFrameAPIControls() {
    // Adds controls for interacting with various Controlled Frame API
    // properties.
    const propertyControlEl = new ControlGroupElement({
      heading: 'Tag Properties',
      controls: [
        this.#getContentWindowControlGroupElement(),
        this.#getContextMenusControlGroupElement(),
      ],
    });
    this.controlGroups.push(propertyControlEl);
    $('#control-div').append(propertyControlEl);

    const methodControlEl = new ControlGroupElement({
      heading: 'Tag Methods',
      controls: [
        this.#getMethodControlGroupElement(),
      ]
    });
    this.controlGroups.push(methodControlEl);
    $('#control-div').append(methodControlEl);

    this.#addControlledFrameMethodHandlers();
    this.#addEventListeners();

    // Allow text areas to expand to fit text.
    let textareas = document.getElementsByTagName('textarea');
    for (let textarea of textareas) {
      textareaExpand(textarea);
      textarea.addEventListener('input', textareaOninputHandler);
    }
  }

  #getContentWindowControlGroupElement() {
    const controls = [
      new ControlElement({
        name: 'postMessage(message, targetOrigin)',
        fields: [
          { name: 'message', type: 'text' },
          { name: 'targetOrigin', type: 'text' },
        ],
        handler: this.#contentWindowPostMessage.bind(this),
      }),
    ];
    return new ControlGroupElement({
      heading: 'contentWindow',
      controls: controls,
    });
  }

  #getContextMenusControlGroupElement() {
    const controls = [];

    // contextMenus.onShow
    const onShowControlEl = new ControlElement({
      fields: [
        {
          name: 'event.preventDefault()',
          id: 'preventDefault',
          type: 'checkbox',
          checked: false,
        }
      ],
      isEventControl: true,
    });
    this.controlledFrame.contextMenus.onShow.addListener(
      this.#contextMenusOnShow.bind(this, onShowControlEl));
    const onShowGroupEl = new ControlGroupElement({
      heading: 'onShow',
      controls: [onShowControlEl],
    });
    controls.push(onShowGroupEl);

    // ContextMenusCreateProperties fields
    const createPropertiesEl = new ControlElement({
      fields: [
        { name: 'checked', type: 'checkbox', checked: false },
        {
          name: 'contexts', type: 'select', multiple: true,
          options: ['all', 'page', 'frame', 'selection', 'link', 'editable',
            'image', 'video', 'audio'],
        },
        { name: 'documentUrlPatterns', type: 'text' },
        { name: 'enabled', type: 'checkbox', checked: false },
        { name: 'id', type: 'text' },
        { name: 'parentId', type: 'text' },
        { name: 'targetUrlPatterns', type: 'text' },
        { name: 'title', type: 'text' },
        {
          name: 'type', type: 'select',
          options: ['normal', 'checkbox', 'radio', 'separator']
        },
        { name: 'onClick(info)', type: 'div', id: 'result' },
      ],
    });
    const createPropertiesGroupEl = new ControlGroupElement({
      heading: 'ContextMenusCreateProperties properties',
      controls: [createPropertiesEl],
    });
    controls.push(createPropertiesGroupEl);

    // contextMenus.create
    const createEl = new ControlElement({
      fields: [{ name: 'create(properties)', type: 'div', id: 'result' }],
      handler: this.#contextMenusCreate.bind(this, createPropertiesEl),
    });
    const createGroupEl = new ControlGroupElement({
      heading: 'create',
      controls: [createEl],
    });
    controls.push(createGroupEl);

    // contextMenus.update
    const updateEl = new ControlElement({
      fields: [
        { name: 'id', type: 'text' },
        { name: 'update(id, properties)', type: 'div', id: 'result' },
      ],
      handler: this.#contextMenusUpdate.bind(this, createPropertiesEl),
    });
    const updateGroupEl = new ControlGroupElement({
      heading: 'update',
      controls: [updateEl],
    });
    controls.push(updateGroupEl);

    // contextMenus.remove and contextMenus.removeAll
    const removeEl = new ControlElement({
      fields: [{ name: 'remove(menuItemId)', type: 'text', id: 'menuItemId' }],
      handler: this.#contextMenusRemove.bind(this),
    });
    const removeAllEl = new ControlElement({
      name: 'removeAll()',
      handler: this.#contextMenusRemoveAll.bind(this),
    });
    const removeGroupEl = new ControlGroupElement({
      heading: 'remove',
      controls: [removeEl, removeAllEl],
    });
    controls.push(removeGroupEl);

    return new ControlGroupElement({
      heading: 'contextMenus',
      controls: controls
    });
  }

  #getMethodControlGroupElement() {
    // Navigation method controls
    const canGoBackControl = new ControlElement({
      fields: [{
        name: 'canGoBack()',
        id: 'canGoBack',
        type: 'checkbox',
        checked: this.#canGoBack(),
        disabled: true,
        refreshValue: this.#canGoBack.bind(this),
      }],
    });
    const canGoForwardControl = new ControlElement({
      fields: [{
        name: 'canGoForward()',
        id: 'canGoForward',
        type: 'checkbox',
        checked: this.controlledFrame.canGoForward(),
        disabled: true,
        refreshValue: this.#canGoForward.bind(this),
      }],
    });
    const backControl = new ControlElement({
      name: 'back()',
      handler: this.#back.bind(this, canGoBackControl),
    });
    const forwardControl = new ControlElement({
      name: 'forward()',
      handler: this.#forward.bind(this, canGoForwardControl),
    });
    const goControl = new ControlElement({
      fields: [{ name: 'go()', id: 'go', type: 'number', value: 0 }],
      handler: this.#go.bind(this, canGoBackControl, canGoForwardControl),
    });
    const reloadControl = new ControlElement({
      name: 'reload()',
      handler: this.#reload.bind(this),
    });
    const stopControl = new ControlElement({
      name: 'stop()',
      handler: this.#stop.bind(this),
    });
    const terminateControl = new ControlElement({
      name: 'terminate()',
      handler: this.#terminate.bind(this),
    });
    const navigationGroupEl = new ControlGroupElement({
      heading: 'Navigation',
      controls: [
        canGoBackControl,
        canGoForwardControl,
        backControl,
        forwardControl,
        goControl,
        reloadControl,
        stopControl,
        terminateControl,
      ],
    });
    return navigationGroupEl;
  }

  // Adds handler functions for calling the various Controlled Frame API
  // methods.
  #addControlledFrameMethodHandlers() {
    $('#add_content_scripts_btn').addEventListener(
      'click',
      this.#addContentScripts.bind(this)
    );
    $('#capture_visible_region_btn').addEventListener(
      'click',
      this.#captureVisibleRegion.bind(this)
    );
    $('#clear_data_btn').addEventListener('click', this.#clearData.bind(this));
    $('#execute_script_btn').addEventListener(
      'click',
      this.#executeScript.bind(this)
    );
    $('#find_btn').addEventListener('click', this.#find.bind(this));
    $('#get_audio_state_btn').addEventListener(
      'click',
      this.#getAudioState.bind(this)
    );
    $('#get_process_id_btn').addEventListener(
      'click',
      this.#getProcessId.bind(this)
    );
    $('#get_zoom_btn').addEventListener('click', this.#getZoom.bind(this));
    $('#get_zoom_mode_btn').addEventListener(
      'click',
      this.#getZoomMode.bind(this)
    );
    $('#insert_css_btn').addEventListener('click', this.#insertCSS.bind(this));
    $('#is_audio_muted_btn').addEventListener(
      'click',
      this.#isAudioMuted.bind(this)
    );
    $('#is_spatial_navigation_enabled_btn').addEventListener(
      'click',
      this.#isSpatialNavigationEnabled.bind(this)
    );
    $('#load_data_with_base_url_btn').addEventListener(
      'click',
      this.#loadDataWithBaseUrl.bind(this)
    );
    $('#print_btn').addEventListener('click', this.#print.bind(this));
    $('#remove_content_scripts_btn').addEventListener(
      'click',
      this.#removeContentScripts.bind(this)
    );
    $('#set_audio_muted_btn').addEventListener(
      'click',
      this.#setAudioMuted.bind(this)
    );
    $('#set_spatial_navigation_enabled_btn').addEventListener(
      'click',
      this.#setSpatialNavigationEnabled.bind(this)
    );
    $('#set_zoom_btn').addEventListener('click', this.#setZoom.bind(this));
    $('#set_zoom_mode_btn').addEventListener(
      'click',
      this.#setZoomMode.bind(this)
    );
    $('#stop_finding_btn').addEventListener(
      'click',
      this.#stopFinding.bind(this)
    );
    $('#user_agent_btn').addEventListener(
      'click',
      this.#setUserAgent.bind(this)
    );
  }

  // Add event listeners for the web request related Controlled Frame API.
  #addWebRequestHandlers() {
    if (typeof this.controlledFrame.request !== 'object') {
      Log.warn('request: Property undefined');
      return;
    }

    $('#request_on_auth_required_btn').addEventListener(
      'click',
      this.#addOnAuthRequired.bind(this)
    );
    $('#request_on_before_redirect_btn').addEventListener(
      'click',
      this.#addOnBeforeRedirect.bind(this)
    );
    $('#request_on_before_request_btn').addEventListener(
      'click',
      this.#addOnBeforeRequest.bind(this)
    );
    $('#request_on_before_send_headers_btn').addEventListener(
      'click',
      this.#addOnBeforeSendHeaders.bind(this)
    );
    $('#request_on_completed_btn').addEventListener(
      'click',
      this.#addOnCompleted.bind(this)
    );
    $('#request_on_error_occurred_btn').addEventListener(
      'click',
      this.#addOnErrorOccurred.bind(this)
    );
    $('#request_on_headers_received_btn').addEventListener(
      'click',
      this.#addOnHeadersReceived.bind(this)
    );
    $('#request_on_response_started_btn').addEventListener(
      'click',
      this.#addOnResponseStarted.bind(this)
    );
    $('#request_on_send_headers_btn').addEventListener(
      'click',
      this.#addOnSendHeaders.bind(this)
    );
  }

  // Add the general <controlledframe> event handlers.
  #addEventListeners() {
    this.controlledFrame.addEventListener('close', this.#onclose.bind(this));
    this.controlledFrame.addEventListener(
      'consolemessage',
      this.#onconsolemessage.bind(this)
    );
    this.controlledFrame.addEventListener(
      'contentload',
      this.#oncontentload.bind(this)
    );
    this.controlledFrame.addEventListener('dialog', this.#ondialog.bind(this));
    this.controlledFrame.addEventListener('exit', this.#onexit.bind(this));
    this.controlledFrame.addEventListener(
      'findupdate',
      this.#onfindupdate.bind(this)
    );
    this.controlledFrame.addEventListener(
      'loadabort',
      this.#onloadabort.bind(this)
    );
    this.controlledFrame.addEventListener(
      'loadcommit',
      this.#onloadcommit.bind(this)
    );
    this.controlledFrame.addEventListener(
      'loadredirect',
      this.#onloadredirect.bind(this)
    );
    this.controlledFrame.addEventListener(
      'loadstart',
      this.#onloadstart.bind(this)
    );
    this.controlledFrame.addEventListener(
      'loadstop',
      this.#onloadstop.bind(this)
    );
    this.controlledFrame.addEventListener(
      'newwindow',
      this.#onnewwindow.bind(this)
    );
    this.controlledFrame.addEventListener(
      'permissionrequest',
      this.#onpermissionrequest.bind(this)
    );
    this.controlledFrame.addEventListener(
      'responsive',
      this.#onresponsive.bind(this)
    );
    this.controlledFrame.addEventListener(
      'sizechanged',
      this.#onsizechanged.bind(this)
    );
    this.controlledFrame.addEventListener(
      'unresponsive',
      this.#onunresponsive.bind(this)
    );
    this.controlledFrame.addEventListener(
      'zoomchange',
      this.#onzoomchange.bind(this)
    );

    this.#addWebRequestHandlers();
  }

  // Attribute handlers
  #setSrc(controlEl) {
    if (!controlEl) {
      controlEl = $('src_control');
    }
    controlEl.GetFieldValue('src').then(src => {
      src = prependHTTPSProtocol(src);
      this.NavigateControlledFrame(src);
      controlEl.UpdateFieldValue('src', src);
    });
  }

  #setPartition(controlEl) {
    if (!controlEl) {
      controlEl = $('partition_control');
    }
    controlEl.GetFieldValue('partition').then(partition => {
      this.controlledFrame.partition = partition;
    });
  }

  #setAllowtransparency(controlEl) {
    if (!controlEl) {
      controlEl = $('allowtransparency_control');
    }
    controlEl.GetFieldValue('allowtransparency').then(allowtransparency => {
      this.controlledFrame.allowtransparency = allowtransparency ? 'on' : '';
    });
  }

  #setAutosize(controlEl) {
    if (!controlEl) {
      controlEl = $('autosize_control');
    }
    controlEl.GetFieldValue('autosize').then(autosize => {
      this.controlledFrame.autosize = autosize ? 'on' : '';
    });
  }

  #setName(controlEl) {
    if (!controlEl) {
      controlEl = $('name_control');
    }
    controlEl.GetFieldValue('name').then(name => {
      this.controlledFrame.name = name;
    });
  }

  // Property handlers
  async #contentWindowPostMessage(controlEl) {
    if (typeof this.controlledFrame.contentWindow !== 'object') {
      Log.warn('contentWindow: property undefined');
      return;
    }

    const message = await controlEl.GetFieldValue('message');
    let targetOrigin = await controlEl.GetFieldValue('targetOrigin');
    targetOrigin = prependHTTPSProtocol(targetOrigin);
    if (!isValidUrl(targetOrigin)) {
      Log.err(`${targetOrigin} is not a valid URL`);
      return;
    }
    this.controlledFrame.contentWindow.postMessage(message, targetOrigin);
    Log.info(
      `contentWindow.postMessage(${message}, ${targetOrigin}) completed`
    );
  }

  // Method handlers
  // Content script related functions
  #readContentScriptDetails() {
    let contentScriptDetails = {
      all_frames: $('#content_script_details_all_frames_chk').checked,
      match_about_blank: $('#content_script_details_match_about_blank_chk')
        .checked,
      css: {},
      js: {},
    };
    // Set the string values that are split by commas.
    for (const keyName of ['exclude_globs', 'exclude_matches', 'include_globs', 'matches']) {
      const keyValue = $(`#content_script_details_${keyName}_in`).value;
      this.#setIfValid(contentScriptDetails, keyName, keyValue, ',');
    }
    // Set the normal string values.
    for (const keyName of ['name', 'run_at']) {
      const keyValue = $(`#content_script_details_${keyName}_in`).value;
      this.#setIfValid(contentScriptDetails, keyName, keyValue);
    }
    // Set the `css` and `js` properties.
    for (const keyName of ['code', 'files']) {
      const cssKeyValue =
        $(`#content_script_details_css_injection_items_${keyName}_in`).value;
      this.#setIfValid(contentScriptDetails.css, keyName, cssKeyValue,
        keyName === 'files' ? ',' : null);
      const jsKeyValue =
        $(`#content_script_details_js_injection_items_${keyName}_in`).value;
      this.#setIfValid(contentScriptDetails.js, keyName, jsKeyValue,
        keyName === 'files' ? ',' : null);
    }
    return contentScriptDetails;
  }

  #refreshAddedContentScripts() {
    let scriptNameList = '';
    for (const contentScript of this.#addedContentScripts)
      scriptNameList += contentScript.name + '\n';
    $('#add_content_scripts_result').innerText = scriptNameList;
  }

  #addContentScripts(e) {
    if (typeof this.controlledFrame.addContentScripts !== 'function') {
      Log.warn('addContentScripts: API undefined');
      return;
    }
    let contentScriptList = new Array();
    contentScriptList.push(this.#readContentScriptDetails());
    this.controlledFrame.addContentScripts(contentScriptList);
    this.#addedContentScripts.push(contentScriptList);
    Log.info('addContentScripts completed');
  }

  // Navigation related functions
  async #back(canGoBackControl, controlEl) {
    if (typeof this.controlledFrame.back !== 'function') {
      Log.warn('back: API undefined');
      return;
    }
    this.controlledFrame.back(success => {
      let successStr = success ? 'successful' : 'unsuccessful';
      Log.info(`back = ${successStr}`);
      canGoBackControl.UpdateFieldValue('canGoBack', this.#canGoBack());
    });
  }

  #canGoBack() {
    if (typeof this.controlledFrame.canGoBack !== 'function') {
      Log.warn('canGoBack: API undefined');
      return false;
    }
    let canGoBack = this.controlledFrame.canGoBack();
    Log.info(`canGoBack = ${canGoBack}`);
    return canGoBack;
  }

  async #forward(canGoForwardControl, controlEl) {
    if (typeof this.controlledFrame.forward !== 'function') {
      Log.warn('forward: API undefined');
      return;
    }
    this.controlledFrame.forward(success => {
      let successStr = success ? 'successful' : 'unsuccessful';
      Log.info(`forward = ${successStr}`);
      canGoForwardControl.UpdateFieldValue('canGoForward', this.#canGoForward());
    });
  }

  #canGoForward() {
    if (typeof this.controlledFrame.canGoForward !== 'function') {
      Log.warn('canGoForward: API undefined');
      return false;
    }
    let canGoForward = this.controlledFrame.canGoForward();
    Log.info(`canGoForward = ${canGoForward}`);
    return canGoForward;
  }

  async #go(canGoBackControl, canGoForwardControl, controlEl) {
    if (typeof this.controlledFrame.go !== 'function') {
      Log.warn('go: API undefined');
      return;
    }
    const value = await controlEl.GetFieldValue('go');
    const num = parseInt(value);
    this.controlledFrame.go(num, success => {
      let successStr = success ? 'successful' : 'unsuccessful';
      Log.info(`go = ${successStr}`);
      canGoBackControl.UpdateFieldValue('canGoBack', this.#canGoBack());
      canGoForwardControl.UpdateFieldValue('canGoForward', this.#canGoForward());
    });
  }

  // Other API functions
  #readImageDetails() {
    return {
      format: $('#image_details_fmt_in').value,
      quality: parseFloat($('#image_details_quality_in').value),
    };
  }

  #captureVisibleRegion(e) {
    if (typeof this.controlledFrame.captureVisibleRegion !== 'function') {
      Log.warn('captureVisibleRegion: API undefined');
      return;
    }

    let imageDetails = this.#readImageDetails();

    let handler = dataUrl => {
      Log.info(`captureVisibleRegion completed`);
      let resultEl = $('#capture_visible_region_result');
      resultEl.src = dataUrl;
      resultEl.classList.remove('hide');
      $('#capture_visible_region_result_btn').onclick = e => {
        toggleHide(resultEl);
      };
    };

    this.controlledFrame.captureVisibleRegion(imageDetails, handler);
  }

  #clearData(e) {
    if (typeof this.controlledFrame.clearData !== 'function') {
      Log.warn('clearData: API undefined');
      return;
    }

    let options = { since: parseInt($('#clear_data_options_since_in').value) };
    let types = {};
    let typesForLogging = new Array();
    for (let option of $('#clear_data_type_set_in').options) {
      types[option.value] = option.selected;
      if (option.selected) typesForLogging.push(option.value);
    }
    let callback = () => {
      Log.info(`clearData finished for ${typesForLogging.join(', ')}`);
    };

    this.controlledFrame.clearData(options, types, callback);
  }

  #readInjectDetails() {
    return {
      code: $('#inject_details_code_in').value,
      file: $('#inject_details_file_in').value,
    };
  }

  #executeScript(e) {
    if (typeof this.controlledFrame.executeScript !== 'function') {
      Log.warn('executeScript: API undefined');
      return;
    }
    let details = this.#readInjectDetails();
    let callback = result => {
      let resultStr = JSON.stringify(result);
      Log.info(`executeScript = ${resultStr}`);
      $('#execute_script_result').innerText = resultStr;
    };
    this.controlledFrame.executeScript(details, callback);
  }

  #find(e) {
    if (typeof this.controlledFrame.find !== 'function') {
      Log.warn('find: API undefined');
      return;
    }

    let searchText = $('#find_search_text_in').value;
    let options = {
      backward: $('#find_options_backward_in').checked,
      matchCase: $('#find_options_match_case_in').checked,
    };
    let callback = results => {
      let resultsStr = `
  {
    activeMatchOrdinal = ${results.activeMatchOrdinal}
    cancelled = ${results.cancelled ? 'yes' : 'no'}
    numberOfMatches = ${results.numberOfMatches}
    selectionRect = {
      height: ${results.selectionRect.height},
      left: ${results.selectionRect.left},
      top: ${results.selectionRect.top},
      width: ${results.selectionRect.width},
  }
      `;
      Log.info(`find = ${resultsStr}`);

      let resultEl = $('#find_result');
      resultEl.innerText = resultsStr;
      resultEl.classList.remove('hide');
      $('#find_result_btn').onclick = e => {
        toggleHide(resultEl);
      };
    };
    this.controlledFrame.find(searchText, options, callback);
  }

  #getAudioState(e) {
    if (typeof this.controlledFrame.getAudioState !== 'function') {
      Log.warn('getAudioState: API undefined');
      return;
    }
    let callback = audible => {
      Log.info(`getAudioState = ${audible}`);
      $('#get_audio_state_chk').checked = audible;
    };
    this.controlledFrame.getAudioState(callback);
  }

  #getProcessId(e) {
    if (typeof this.controlledFrame.getProcessId !== 'function') {
      Log.warn('getProcessId: API undefined');
      return;
    }
    let id = this.controlledFrame.getProcessId();
    $('#get_process_id_result').innerText = id;
  }

  #getUserAgent(e) {
    if (typeof this.controlledFrame.getUserAgent !== 'function') {
      Log.warn('getUserAgent: API undefined');
      return;
    }
    let userAgent = this.controlledFrame.getUserAgent();
    $('#user_agent_in').value = userAgent;
    Log.info(`userAgent = ${userAgent}`);
  }

  #getZoom(e) {
    if (typeof this.controlledFrame.getZoom !== 'function') {
      Log.warn('getZoom: API undefined');
      return;
    }
    let callback = zoomFactor => {
      Log.info(`getZoom = ${zoomFactor}`);
      $('#get_zoom_result').innerText = zoomFactor;
    };
    this.controlledFrame.getZoom(callback);
  }

  #getZoomMode(e) {
    if (typeof this.controlledFrame.getZoomMode !== 'function') {
      Log.warn('getZoomMode: API undefined');
      return;
    }
    let callback = zoomMode => {
      Log.info(`getZoomMode = ${zoomMode}`);
      $('#get_zoom_mode_result').innerText = zoomMode;
    };
    this.controlledFrame.getZoomMode(callback);
  }

  #insertCSS(e) {
    if (typeof this.controlledFrame.insertCSS !== 'function') {
      Log.warn('insertCSS: API undefined');
      return;
    }
    let details = this.#readInjectDetails();
    let callback = () => {
      Log.info('insertCSS completed');
      $('#insert_css_result').innerText = 'Done';
    };
    this.controlledFrame.insertCSS(details, callback);
  }

  #isAudioMuted(e) {
    if (typeof this.controlledFrame.isAudioMuted !== 'function') {
      Log.warn('isAudioMuted: API undefined');
      return;
    }
    let callback = muted => {
      Log.info(`isAudioMuted = ${muted}`);
      $('#is_audio_muted_chk').checked = muted;
    };
    this.controlledFrame.isAudioMuted(callback);
  }

  #isSpatialNavigationEnabled(e) {
    if (typeof this.controlledFrame.isSpatialNavigationEnabled !== 'function') {
      Log.warn('isSpatialNavigationEnabled: API undefined');
      return;
    }
    let callback = enabled => {
      Log.info(`isSpatialNavigationEnabled = ${enabled}`);
      $('#is_spatial_navigation_enabled_result').innerText = enabled;
    };
    this.controlledFrame.isSpatialNavigationEnabled(callback);
  }

  #isUserAgentOverridden(e) {
    if (typeof this.controlledFrame.isUserAgentOverridden !== 'function') {
      Log.warn('isUserAgentOverridden: API undefined');
      return;
    }
    let overridden = this.controlledFrame.isUserAgentOverridden();
    $('#user_agent_chk').checked = overridden;
    Log.info(`isUserAgentOverridden = ${overridden}`);
  }

  #loadDataWithBaseUrl(e) {
    if (typeof this.controlledFrame.loadDataWithBaseUrl !== 'function') {
      Log.warn('loadDataWithBaseUrl: API undefined');
      return;
    }
    let dataUrl = $('#load_data_with_base_url_data_url_in').value;
    let baseUrl = $('#load_data_with_base_url_base_url_in').value;
    let virtualUrl = $('#load_data_with_base_url_virtual_url_in').value;
    this.controlledFrame.loadDataWithBaseUrl(dataUrl, baseUrl, virtualUrl);
    Log.info('loadDataWithBaseUrl completed');
  }

  #print(e) {
    if (typeof this.controlledFrame.print !== 'function') {
      Log.warn('print: API undefined');
      return;
    }
    this.controlledFrame.print();
    Log.info('print completed');
  }

  #reload(e) {
    if (typeof this.controlledFrame.reload !== 'function') {
      Log.warn('reload: API undefined');
      return;
    }
    this.controlledFrame.reload();
    Log.info('reload completed');
  }

  #removeContentScripts(e) {
    if (typeof this.controlledFrame.removeContentScripts !== 'function') {
      Log.warn('removeContentScripts: API undefined');
      return;
    }
    let scriptNames = $('#remove_content_scripts_in').value;
    let scriptNameList = scriptNames.split(',');
    this.controlledFrame.removeContentScripts(scriptNameList);
    Log.info(`removeContentScripts([${scriptNames}])`);
    this.#addedContentScripts.forEach((script, i) => {
      let foundIndex = scriptNameList.findIndex(s => s === script.name);
      if (foundIndex === -1) {
        return;
      }
      this.#addedContentScripts.splice(foundIndex, 1);
    });
  }

  #setAudioMuted(e) {
    if (typeof this.controlledFrame.setAudioMuted !== 'function') {
      Log.warn('setAudioMuted: API undefined');
      return;
    }
    let muted = $('#set_audio_muted_chk').checked;
    this.controlledFrame.setAudioMuted(muted);
    Log.info(`setAudioMuted(${muted}) completed`);
    this.#isAudioMuted();
  }

  #setSpatialNavigationEnabled(e) {
    if (
      typeof this.controlledFrame.setSpatialNavigationEnabled !== 'function'
    ) {
      Log.warn('setSpatialNavigationEnabled: API undefined');
      return;
    }
    let enabled = $('#set_spatial_navigation_enabled_chk').checked;
    this.controlledFrame.setSpatialNavigationEnabled(enabled);
    Log.info(`setSpatialNavigationEnabled(${enabled}) completed`);
    this.RefreshState();
  }

  #setUserAgent(e) {
    if (typeof this.controlledFrame.setUserAgentOverride !== 'function') {
      Log.warn(`setUserAgentOverride: API undefined`);
      return;
    }

    let userAgentOverride = $('#user_agent_in').value;
    this.controlledFrame.setUserAgentOverride(userAgentOverride);
    Log.info(`userAgentOverride = ${userAgentOverride}`);
    this.RefreshState();
  }

  #setZoom(e) {
    if (typeof this.controlledFrame.setZoom !== 'function') {
      Log.warn('setZoom: API undefined');
      return;
    }
    let zoomFactor = parseFloat($('#set_zoom_in').value);
    let callback = () => {
      Log.info(`setZoom(${zoomFactor}) completed`);
      this.RefreshState();
    };
    this.controlledFrame.setZoom(zoomFactor, callback);
  }

  #setZoomMode(e) {
    if (typeof this.controlledFrame.setZoomMode !== 'function') {
      Log.warn('setZoomMode: API undefined');
      return;
    }
    let zoomMode = $('#set_zoom_mode_in').value;
    let callback = () => {
      Log.info(`setZoomMode(${zoomMode}) completed`);
      this.RefreshState();
    };
    this.controlledFrame.setZoomMode(zoomMode, callback);
  }

  #stop(e) {
    if (typeof this.controlledFrame.stop !== 'function') {
      Log.warn('stop: API undefined');
      return;
    }
    this.controlledFrame.stop();
    Log.info('stop completed');
  }

  #stopFinding(e) {
    if (typeof this.controlledFrame.stopFinding !== 'function') {
      Log.warn('stopFinding: API undefined');
      return;
    }
    let action = $('#stop_finding_in').value;
    this.controlledFrame.stopFinding(action);
    Log.info(`stopFinding(${action}) completed`);
  }

  async #terminate(controlEl) {
    if (typeof this.controlledFrame.terminate !== 'function') {
      Log.warn('terminate: API undefined');
      return;
    }
    this.controlledFrame.terminate();
    Log.info('terminate completed');
  }

  /**
   * Event handlers
   */
  #onclose(e) {
    Log.evt('close fired');
    this.controlledFrame.src = 'https://google.com';
  }

  #onconsolemessage(e) {
    Log.evt('consolemessage fired');
    Log.info(
      `level = ${e.level}, message = ${e.message}, line = ${e.line}, sourceId = ${e.sourceId}`
    );
  }

  #oncontentload(e) {
    Log.evt('contentload fired');
  }

  #ondialog(e) {
    Log.evt('dialog fired');
    Log.info(`messageType = ${e.messageType}, messageText = ${e.messageText}`);
    e.dialog.ok();
  }

  #onexit(e) {
    Log.evt('exit fired');
    Log.info(`processID = ${e.processID}, reason = ${e.reason}`);
  }

  #onfindupdate(e) {
    Log.evt('findupdate fired');
    Log.info(`searchText = ${e.searchText}, numberOfMatches = ${e.numberOfMatches}, activeMatchOrdinal = ${activeMatchOrdinal}, selectionRect = {height: ${e.selectionRect.height},
        left: ${e.selectionRect.left}, top: ${e.selectionRect.top},
        width: ${e.selectionRect.width}}, canceled = ${e.canceled},
        finalUpdate = ${e.finalUpdate}`);
  }

  #onloadabort(e) {
    Log.evt('loadabort fired');
    Log.info(
      `url = ${e.url}, isTopLevel = ${e.isTopLevel}, code = ${e.code}, reason = ${e.reason}`
    );
  }

  #onloadcommit(e) {
    Log.evt('loadcommit fired');
    Log.info(`url = ${e.url}, isTopLevel = ${e.isTopLevel}`);
    this.RefreshState();
  }

  #onloadredirect(e) {
    Log.evt('loadredirect fired');
    Log.info(
      `oldUrl = ${e.oldUrl}, newUrl = ${e.newUrl}, isTopLevel = ${e.isTopLevel}`
    );
  }

  #onloadstart(e) {
    Log.evt('loadstart fired');
    Log.info(`url = ${e.url}, isTopLevel = ${e.isTopLevel}`);
  }

  #onloadstop(e) {
    Log.evt('loadstop fired');
  }

  #onnewwindow(e) {
    Log.evt('newwindow fired');
    Log.info(
      `targetUrl = ${e.targetUrl}, initialWidth = ${e.initialWidth}, initialHeight = ${e.initialHeight}, name = ${e.name}, windowOpenDisposition = ${e.windowOpenDisposition}`
    );
    e.window.discard();
  }

  #onpermissionrequest(e) {
    Log.evt('permissionrequest fired');
    Log.info(`permission = ${e.permission}`);
    e.request.allow();
  }

  #onresponsive(e) {
    Log.evt('responsive fired');
    Log.info(`processID = ${e.processID}`);
  }

  #onsizechanged(e) {
    Log.evt('sizechanged fired');
    Log.info(
      `oldWidth = ${e.oldWidth}, oldHeight = ${e.oldHeight}, newWidth = ${e.newWidth}, newHeight = ${e.newHeight}`
    );
  }

  #onunresponsive(e) {
    Log.evt('unresponsive fired');
    Log.info(`processID = ${e.processID}`);
  }

  #onzoomchange(e) {
    Log.evt('zoomchange fired');
    Log.info(
      `oldZoomFactor = ${e.oldZoomFactor}, newZoomFactor = ${e.newZoomFactor}`
    );
  }

  async #contextMenusOnShow(controlEl, event) {
    const preventDefault = await controlEl.GetFieldValue('preventDefault');
    if (preventDefault) {
      event.preventDefault();
    }
    Log.evt(`contextMenus.onShow fired, preventDefault = ${preventDefault ? 'true' : 'false'}`);
  }

  #setIfValid(object, keyName, keyValue, splitDelimiter = null) {
    if (!keyValue || !keyValue.length > 0) {
      return;
    }
    if (splitDelimiter) {
      object[keyName] = keyValue.split(splitDelimiter);
      return;
    }
    object[keyName] = keyValue;
  }

  async #readContextMenusCreateProperties(createPropertiesEl, controlEl) {
    let contexts = new Array();
    for (const option of $('#context_menus_create_properties_contexts_in')
      .options) {
      if (option.selected) contexts.push(option.value);
    }

    let createProperties = {
      checked: $('#context_menus_create_properties_checked_chk').checked,
      enabled: $('#context_menus_create_properties_enabled_chk').checked,
      onclick: info => {
        let infoJSON = JSON.stringify(info);
        Log.info(`context menu item clicked: ${infoJSON}`);
        createPropertiesEl.UpdateFieldValue('result', infoJSON);
      },
    };

    for (const keyName of ['id', 'parentId', 'title', 'type']) {
      const keyValue =
        $(`#context_menus_create_properties_${keyName}_in`).value;
      this.#setIfValid(createProperties, keyName, keyValue);
    }

    let documentUrlPatternsValue = $(
      '#context_menus_create_properties_document_url_patterns_in'
    ).value;
    if (documentUrlPatternsValue.length !== 0) {
      let documentUrlPatterns = documentUrlPatternsValue.split(',');
      createProperties.documentUrlPatterns = documentUrlPatterns;
    }

    let targetUrlPatternsValue =
      await createPropertiesEl.GetFieldValue('targetUrlPatterns');
    if (targetUrlPatternsValue.length !== 0) {
      let targetUrlPatterns = targetUrlPatternsValue.split(',');
      createProperties.targetUrlPatterns = targetUrlPatterns;
    }

    return createProperties;
  }

  async #contextMenusCreate(createPropertiesEl, controlEl) {
    if (
      typeof this.controlledFrame.contextMenus !== 'object' ||
      typeof this.controlledFrame.contextMenus.create !== 'function'
    ) {
      Log.warn('contextMenus.create: API undefined');
      return;
    }
    const createProperties = await this.#readContextMenusCreateProperties(
      createPropertiesEl, controlEl);
    const callback = () => {
      Log.info(`contextMenus.create callback called`);
    };
    let contextMenuID = this.controlledFrame.contextMenus.create(
      createProperties,
      callback
    );
    Log.info(`contextMenus.create = ${contextMenuID}`);
    await controlEl.UpdateFieldValue('result', `id = ${contextMenuID}`);
  }

  async #contextMenusRemove(controlEl) {
    if (typeof this.controlledFrame.contextMenus.remove !== 'function') {
      Log.warn('contextMenus.remove: API undefined');
      return;
    }

    const menuItemId = await controlEl.GetFieldValue('menuItemId');
    const callback = () => {
      Log.info(`contextMenus.remove(${menuItemId}) completed`);
    };
    this.controlledFrame.contextMenus.remove(menuItemId, callback);
  }

  async #contextMenusRemoveAll(controlEl) {
    if (typeof this.controlledFrame.contextMenus.removeAll !== 'function') {
      Log.warn('contextMenus.removeAll: API undefined');
      return;
    }
    const callback = () => {
      Log.info('contextMenus.removeAll completed');
    };
    this.controlledFrame.contextMenus.removeAll(callback);
  }

  async #contextMenusUpdate(createPropertiesEl, controlEl) {
    if (typeof this.controlledFrame.contextMenus.update !== 'function') {
      Log.warn('contextMenus.update: API undefined');
      return;
    }
    const id = await controlEl.GetFieldValue('id');
    const updateProperties =
      await this.#readContextMenusCreateProperties(createPropertiesEl, controlEl);
    let callback = () => {
      Log.info(`contextMenus.update(${id}) completed`);
    };
    this.controlledFrame.contextMenus.update(id, updateProperties, callback);
  }

  #readRequestFilter() {
    let filter = {};
    let tabId = $('#request_filter_tab_id').value;
    if (tabId.length !== 0) filter.tabId = parseInt(tabId);
    let types = new Array();
    for (const option of $('#request_filter_types').options) {
      if (option.selected) types.push(option.value);
    }
    if (types.length !== 0) filter.types = types;
    let urls = $('#request_filter_urls').value;
    if (urls.length !== 0) filter.urls = urls.split(',');
    let windowId = $('#request_filter_window_id').value;
    if (windowId.length !== 0) filter.windowId = parseInt(windowId);
    return filter;
  }

  #readBlockingResponse() {
    let blockingResponse = {};
    let password = $('#blocking_response_auth_credentials_password').value;
    if (password.length !== 0)
      blockingResponse.authCredentials.password = password;
    let username = $('#blocking_response_auth_credentials_username').value;
    if (username.length !== 0)
      blockingResponse.authCredentials.username = username;
    blockingResponse.cancel = $('#blocking_response_cancel').checked;
    let redirectUrl = $('#blocking_response_redirect_url').value;
    redirectUrl = prependHTTPSProtocol(redirectUrl);
    if (redirectUrl !== 0 && isValidUrl(redirectUrl))
      blockingResponse.redirectUrl = redirectUrl;
    let requestHeaders = $('#blocking_response_request_headers').value;
    if (requestHeaders.length !== 0) {
      try {
        requestHeaders = JSON.parse(requestHeaders);
        if (requestHeaders && typeof requestHeaders === 'object')
          blockingResponse.requestHeaders = requestHeaders;
      } catch (e) { }
    }
    let responseHeaders = $('#blocking_response_response_headers').value;
    if (responseHeaders.length !== 0) {
      try {
        responseHeaders = JSON.parse(responseHeaders);
        if (responseHeaders && typeof responseHeaders === 'object')
          blockingResponse.responseHeaders = responseHeaders;
      } catch (e) { }
    }
    return blockingResponse;
  }

  #addOnAuthRequired(e) {
    if (typeof this.controlledFrame.request.onAuthRequired !== 'object') {
      Log.warn('request.onAuthRequired: API undefined');
      return;
    }

    let filter = this.#readRequestFilter();
    let extraInfoSpec = new Array();
    for (const option of $('#on_auth_required_extra_info_spec').options) {
      if (option.selected) extraInfoSpec.push(option.value);
    }
    let callback = (details, asyncCallback) => {
      Log.evt('onAuthRequired fired');
      Log.info(`details = ${JSON.stringify(details)}`);
      if (extraInfoSpec.includes('blocking')) {
        Log.info('Responding with BlockingResponse response');
        return this.#readBlockingResponse();
      }
      if (extraInfoSpec.includes('asyncBlocking')) {
        Log.info('Asynchronously responding with BlockingResponse response');
        asyncCallback(this.#readBlockingResponse);
      }
    };
    this.controlledFrame.request.onAuthRequired.addListener(
      callback,
      filter,
      extraInfoSpec
    );
    Log.info('Added onAuthRequired event handler');
  }

  #addOnBeforeRedirect(e) {
    if (typeof this.controlledFrame.request.onBeforeRedirect !== 'object') {
      Log.warn('request.onBeforeRedirect: API undefined');
      return;
    }

    let filter = this.#readRequestFilter();
    let extraInfoSpec = new Array();
    for (const option of $('#on_before_redirect_extra_info_spec').options) {
      if (option.selected) extraInfoSpec.push(option.value);
    }
    let callback = details => {
      Log.evt('onBeforeRedirect fired');
      Log.info(`details = ${JSON.stringify(details)}`);
      Log.info('Responding with BlockingResponse response');
      return this.#readBlockingResponse();
    };
    this.controlledFrame.request.onBeforeRedirect.addListener(
      callback,
      filter,
      extraInfoSpec
    );
    Log.info('Added onBeforeRedirect event handler');
  }

  #addOnBeforeRequest(e) {
    if (typeof this.controlledFrame.request.onBeforeRequest !== 'object') {
      Log.warn('request.onBeforeRequest: API undefined');
      return;
    }

    let filter = this.#readRequestFilter();
    let extraInfoSpec = new Array();
    for (const option of $('#on_before_request_extra_info_spec').options) {
      if (option.selected) extraInfoSpec.push(option.value);
    }
    let callback = details => {
      Log.evt('onBeforeRequest fired');
      Log.info(`details = ${JSON.stringify(details)}`);
      Log.info('Responding with BlockingResponse response');
      if (extraInfoSpec.includes('blocking'))
        return this.#readBlockingResponse();
    };
    this.controlledFrame.request.onBeforeRequest.addListener(
      callback,
      filter,
      extraInfoSpec
    );
    Log.info('Added onBeforeRequest event handler');
  }

  #addOnBeforeSendHeaders(e) {
    if (typeof this.controlledFrame.request.onBeforeSendHeaders !== 'object') {
      Log.warn('request.onBeforeSendHeaders: API undefined');
      return;
    }

    let filter = this.#readRequestFilter();
    let extraInfoSpec = new Array();
    for (const option of $('#on_before_send_headers_extra_info_spec').options) {
      if (option.selected) extraInfoSpec.push(option.value);
    }
    let callback = details => {
      Log.evt('onBeforeSendHeaders fired');
      Log.info(`details = ${JSON.stringify(details)}`);
      Log.info('Responding with BlockingResponse response');
      if (extraInfoSpec.includes('blocking'))
        return this.#readBlockingResponse();
    };
    this.controlledFrame.request.onBeforeSendHeaders.addListener(
      callback,
      filter,
      extraInfoSpec
    );
    Log.info('Added onBeforeSendHeaders event handler');
  }

  #addOnCompleted(e) {
    if (typeof this.controlledFrame.request.onCompleted !== 'object') {
      Log.warn('request.onCompleted: API undefined');
      return;
    }

    let filter = this.#readRequestFilter();
    let extraInfoSpec = new Array();
    for (const option of $('#on_completed_extra_info_spec').options) {
      if (option.selected) extraInfoSpec.push(option.value);
    }
    let callback = details => {
      Log.evt('onCompleted fired');
      Log.info(`details = ${JSON.stringify(details)}`);
    };
    this.controlledFrame.request.onCompleted.addListener(
      callback,
      filter,
      extraInfoSpec
    );
    Log.info('Added onCompleted event handler');
  }

  #addOnErrorOccurred(e) {
    if (typeof this.controlledFrame.request.onErrorOccurred !== 'object') {
      Log.warn('request.onErrorOccurred: API undefined');
      return;
    }

    let filter = this.#readRequestFilter();
    let extraInfoSpec = new Array();
    for (const option of $('#on_error_occurred_extra_info_spec').options) {
      if (option.selected) extraInfoSpec.push(option.value);
    }
    let callback = details => {
      Log.evt('onErrorOccurred fired');
      Log.info(`details = ${JSON.stringify(details)}`);
    };
    this.controlledFrame.request.onErrorOccurred.addListener(
      callback,
      filter,
      extraInfoSpec
    );
    Log.info('Added onErrorOccurred event handler');
  }

  #addOnHeadersReceived(e) {
    if (typeof this.controlledFrame.request.onHeadersReceived !== 'object') {
      Log.warn('request.onHeadersReceived: API undefined');
      return;
    }

    let filter = this.#readRequestFilter();
    let extraInfoSpec = new Array();
    for (const option of $('#on_headers_received_extra_info_spec').options) {
      if (option.selected) extraInfoSpec.push(option.value);
    }
    let callback = details => {
      Log.evt('onHeadersReceived fired');
      Log.info(`details = ${JSON.stringify(details)}`);
      Log.info('Responding with BlockingResponse response');
      if (extraInfoSpec.includes('blocking'))
        return this.#readBlockingResponse();
    };
    this.controlledFrame.request.onHeadersReceived.addListener(
      callback,
      filter,
      extraInfoSpec
    );
    Log.info('Added onHeadersReceived event handler');
  }

  #addOnResponseStarted(e) {
    if (typeof this.controlledFrame.request.onResponseStarted !== 'object') {
      Log.warn('request.onResponseStarted: API undefined');
      return;
    }

    let filter = this.#readRequestFilter();
    let extraInfoSpec = new Array();
    for (const option of $('#on_response_started_extra_info_spec').options) {
      if (option.selected) extraInfoSpec.push(option.value);
    }
    let callback = details => {
      Log.evt('onResponseStarted fired');
      Log.info(`details = ${JSON.stringify(details)}`);
    };
    this.controlledFrame.request.onResponseStarted.addListener(
      callback,
      filter,
      extraInfoSpec
    );
    Log.info('Added onResponseStarted event handler');
  }

  #addOnSendHeaders(e) {
    if (typeof this.controlledFrame.request.onSendHeaders !== 'object') {
      Log.warn('request.onSendHeaders: API undefined');
      return;
    }

    let filter = this.#readRequestFilter();
    let extraInfoSpec = new Array();
    for (const option of $('#on_send_headers_extra_info_spec').options) {
      if (option.selected) extraInfoSpec.push(option.value);
    }
    let callback = details => {
      Log.evt('onSendHeaders fired');
      Log.info(`details = ${JSON.stringify(details)}`);
    };
    this.controlledFrame.request.onSendHeaders.addListener(
      callback,
      filter,
      extraInfoSpec
    );
    Log.info('Added onSendHeaders event handler');
  }

  static controlledFrame;
  static controlGroups = new Array();
  #addedContentScripts = new Array();
  #urlParams;
}

export { ControlledFrameController };
