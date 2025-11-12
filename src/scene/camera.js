import * as THREE from "three";
import { entity } from '../utils/entity.js';
import { mapValue } from "../utils/utils.js";
export const third_person_camera = (() => {
  
  class ThirdPersonCamera extends entity.Component {
    constructor(params) {
      super();
      this._params = params;
      this._camera = params.camera;
      this._currentPosition = new THREE.Vector3();
      this._currentLookat = new THREE.Vector3();
      this._lerpFactor = 0.1; 
    }

    _CalculateIdealOffset() {
      // const d = -12
      const d = -8
      const idealOffset = new THREE.Vector3(0, 2.5, d);
      idealOffset.applyQuaternion(this._params.target.quaternion);
      idealOffset.add(this._params.target.position);
      return idealOffset;
    }

    _CalculateIdealLookat() {
      const idealLookat = new THREE.Vector3(0, 2, 10);
      idealLookat.applyQuaternion(this._params.target.quaternion);
      idealLookat.add(this._params.target.position);
      return idealLookat;
    }

    Update(timeElapsed) {
      // console.log(timeElapsed)
      const idealOffset = this._CalculateIdealOffset();
      const idealLookat = this._CalculateIdealLookat();

      this._currentPosition.lerp(idealOffset, this._lerpFactor);
      this._currentLookat.lerp(idealLookat, this._lerpFactor);
idealOffset
      this._currentPosition.y += mapValue(this._params.target.children[0].rotation.x, -Math.PI, Math.PI, -3, 3)


      this._camera.position.copy(this._currentPosition);
      this._camera.lookAt(this._currentLookat);
      this._camera.rotation.x += mapValue(this._params.target.children[0].rotation.x, -Math.PI, Math.PI, -.5, .5)

    }
  }

  return {
    ThirdPersonCamera: ThirdPersonCamera
  };

})();
