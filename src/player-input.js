import { entity } from "./entity.js";

export const player_input = (() => {

  class PlayerInput extends entity.Component {
    constructor(params) {
      super();
      this.params_ = params;
    }

    InitEntity() {
      console.log("Initializing PlayerInput");

      this.Parent.Attributes.InputCurrent = {
        forwardVelocity: 0.0,
        forwardAcceleration: 0.0,
        axis1Side: 0.0,
        space: false,
        shift: false,
        upwardVelocity: 0.0,
        upwardAcceleration: 0.0,
      };

      this.Parent.Attributes.InputPrevious = { ...this.Parent.Attributes.InputCurrent };

      document.addEventListener('keydown', (e) => this.OnKeyDown_(e), false);
      document.addEventListener('keyup', (e) => this.OnKeyUp_(e), false);
    }

    OnKeyDown_(event) {
      if (event.currentTarget.activeElement != document.body) {
        return;
      }
      console.log(event.keyCode);
      switch (event.keyCode) {
        // case 65: // a
        //   this.Parent.Attributes.InputCurrent.axis1Side = -1.0;
        //   break;
        // case 68: // d
        //   this.Parent.Attributes.InputCurrent.axis1Side = 1.0;
        //   break;
        case 87: // W
          this.Parent.Attributes.InputCurrent.forwardAcceleration = 1.0;
          break;
        case 83: // S
          this.Parent.Attributes.InputCurrent.forwardAcceleration = -1.0;
          break;
        case 32: // SPACE
          this.Parent.Attributes.InputCurrent.upwardAcceleration = 1.0; 
          break;
        case 16: // SHIFT
          this.Parent.Attributes.InputCurrent.upwardAcceleration = -1.0; 
          break;
      }
    }
    
    OnKeyUp_(event) {
      if (event.currentTarget.activeElement != document.body) {
        return;
      }
      switch (event.keyCode) {
        case 32: // SPACE
        case 16: // SHIFT
          this.Parent.Attributes.InputCurrent.upwardAcceleration = 0.0; 
          break;
        // case 65: // a
        //   this.Parent.Attributes.InputCurrent.axis1Side = 0.0;
        //   break;
        // case 68: // d
        //   this.Parent.Attributes.InputCurrent.axis1Side = 0.0;
        //   break;
      }
    }

    Update(_) {
      this.Parent.Attributes.InputPrevious = {
        ...this.Parent.Attributes.InputCurrent
      };
    }
  };

  return {
    PlayerInput: PlayerInput,
  };

})();
