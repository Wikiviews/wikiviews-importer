/**
 * File is NOT typechecked by Flow, because it throws errors at the import statement and now other type relevant
 * information are inside the file
 */
import { EventEmitter } from "events";

/**
 * Event emitter for emitting launch events
 * @access private
 */
export class LaunchEmitter extends EventEmitter {
  constructor() {
    super();
  }

  launch() {
    this.emit('launch');
  }
}
export default LaunchEmitter;
