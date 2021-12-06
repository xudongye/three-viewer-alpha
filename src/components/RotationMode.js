import TransformProxy from "./TransformProxy";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";

class RotationMode {
    constructor(viewer) {
        this.camera = viewer.defaultCamera;
        this.domElement = viewer.renderer.domElement;
        this.controls = viewer.controls;
        this.scene = viewer.scene;
        this.objectRotationControls = null;
        this.selectionProxy = viewer.selectionProxy;
        this.viewer = viewer;
        this.rotation = null;
    }

    create(pickedObject) {
        let _this = this;
        this.exit();
        // pickedObject = this.viewer.scene.getObjectByName('Group#75') //测试用的
        this.viewer.justifyLocation(pickedObject);
        this.objectRotationControls = new TransformControls(this.camera, this.domElement);
        this.objectRotationControls.addEventListener('dragging-changed', function (event) {
            _this.controls.enabled = !event.value;
        });
        // this.objectRotationControls.addEventListener('mouseDown', (event) => {
        //     this.selectionProxy.hiddenProxy();
        // })
        this.objectRotationControls.addEventListener('mouseUp', function (event) {
            console.log("旋转事件：" + event)
        })
        this.objectRotationControls.attach(pickedObject);
        this.objectRotationControls.setMode('rotate');
        // this.objectRotationControls.setSpace('local');
        this.scene.add(this.objectRotationControls);
    }

    exit() {
        this.selectionProxy.hiddenProxy();
        if (this.objectRotationControls) {
            this.viewer.scene.remove(this.objectRotationControls);
            this.objectRotationControls.dispose();
            this.objectRotationControls.detach();
            this.objectRotationControls = null;
        }
    }


}

export default RotationMode;