import { $, Log, ttPolicy } from './common.js';
import { ControlledFrameController } from './controlledframe_api.js';
import { ControlGroupElement } from './controlGroupElement.js';
import { ControlElement } from './controlElement.js';

/**
 * Service worker
 */
let swRegistrationPromise = null;
if ('serviceWorker' in navigator) {
  const sanitized = ttPolicy.createScriptURL('/sw.js');
  swRegistrationPromise = navigator.serviceWorker.register(sanitized);
}

/**
 * Page initialization
 */
document.addEventListener('DOMContentLoaded', init);
Log.info('DOMContentLoaded event listener registered');

let controller = null;
async function init() {
  controller = new ControlledFrameController();
  await addPageControls();
}

async function addPageControls() {
  let controlGroupElement = new ControlGroupElement({heading: 'App Controls'});

  if (swRegistrationPromise !== null) {
    let registration = await swRegistrationPromise;
    let updateSWHandler = () => registration.update();
    let updateSWControl = new ControlElement({
      name: 'Update ServiceWorker',
      buttonText: 'Update',
      handler: updateSWHandler,
    });
    controlGroupElement.AddControl(updateSWControl);
  }

  let recreateCFControl = new ControlElement({
    name: 'Recreate Controlled Frame',
    buttonText: 'Recreate',
    handler: controller.CreateControlledFrameTag.bind(controller),
  });
  controlGroupElement.AddControl(recreateCFControl);
  $('#control-div').prepend(controlGroupElement);
}
