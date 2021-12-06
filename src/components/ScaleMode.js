import { TransformControls } from "three/examples/jsm/controls/TransformControls";

class ScaleMode {
    constructor(viewer) {
        this.camera = viewer.defaultCamera;
        this.domElement = viewer.renderer.domElement;
        this.controls = viewer.controls;
        this.scene = viewer.scene;
        this.objectScaleControls = null;
        this.selectionProxy = viewer.selectionProxy;
        this.viewer = viewer;
        this.rotation = null;
    }

    create(pickedObject) {
        let _this = this;
        this.exit();
        this.viewer.justifyLocation(pickedObject);
        this.objectScaleControls = new TransformControls(this.camera, this.domElement);
        this.objectScaleControls.addEventListener('dragging-changed', function (event) {
            _this.controls.enabled = !event.value;
        });
        // this.objectScaleControls.addEventListener('mouseDown', (event) => {
        //     this.selectionProxy.hiddenProxy();
        // })
        this.objectScaleControls.addEventListener('mouseUp', function (event) {
            console.log("缩放事件：" + event)
        })
        this.objectScaleControls.attach(pickedObject);
        this.objectScaleControls.setMode('scale');
        // this.objectScaleControls.setSpace('local');
        this.scene.add(this.objectScaleControls);
    }

    exit() {
        this.selectionProxy.hiddenProxy();
        if (this.objectScaleControls) {
            this.viewer.scene.remove(this.objectScaleControls);
            this.objectScaleControls.dispose();
            this.objectScaleControls.detach();
            this.objectScaleControls = null;
        }
    }


}

export default ScaleMode;