import TransformProxy from "./TransformProxy";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";

export default class TransformMode {
    constructor(viewer) {
        this.camera = viewer.defaultCamera;
        this.domElement = viewer.renderer.domElement;
        this.controls = viewer.controls;
        this.scene = viewer.scene;
        this.objectTransformControls = null;
        this.selectionProxy = viewer.selectionProxy;
        this.viewer = viewer;
    }

    //进入移动模式
    enter(pickedObject) {
        let _this = this;
        this.exit();
        if (pickedObject) {
            this.viewer.justifyLocation(pickedObject);
            this.objectTransformControls = new TransformControls(this.camera, this.domElement);
            // this.objectTransformControls.setSize(0.8);
            // this.objectTransformControls.addEventListener('mouseDown', (e) => {
            //     this.selectionProxy.hiddenProxy();
            // })
            this.objectTransformControls.addEventListener('mouseUp', function (event) {
                console.log("移动事件：" + event)
            })
            //去掉拖动时，视角跟随移动的交互
            this.objectTransformControls.addEventListener('dragging-changed', function (event) {
                _this.controls.enabled = !event.value;
            });
            this.objectTransformControls.attach(pickedObject);
            this.scene.add(this.objectTransformControls);
        }
    }
    //退出移动模式
    exit() {
        this.selectionProxy.hiddenProxy();
        if (this.objectTransformControls) {
            this.viewer.scene.remove(this.objectTransformControls);
            this.objectTransformControls.dispose();
            this.objectTransformControls.detach();
            this.objectTransformControls = null;
        }
    }
}