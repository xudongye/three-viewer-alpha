import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { createElement, getElementWidth, getElementHeight } from '../utility/dom-helper';
import '../scss/infoLabel.scss';
import label3dLine from '../images/label3d-line.png'

class InfoLabel {

    constructor(viewer) {

        this.viewer = viewer || null;
        this.container = viewer.el || null;

        this.labelText = null;
        this.nodeId = null;
        this.labelLine = null;

        this.isAnimate = false;
        this.startPos = null;
        this.endPos = null;

        this.prevOrientation_x = null;
        this.labelEl = null;
        this.css2dLabelAll = [];
        this.label3dAll = [];
        this.labelAll = [];

        this.textureLoader = new THREE.TextureLoader();

        this.label3dMaterial = {}

        //referAngleObject用于获取一个统一的3d标牌的角度
        const referAngleMat = new THREE.MeshBasicMaterial();
        const referAngleGeometry = new THREE.BoxGeometry();

        this.referAngleObject = new THREE.Mesh(referAngleMat, referAngleGeometry);


        this.init();

    }

    init() {


        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(getElementWidth(this.container), getElementHeight(this.container));
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        this.labelRenderer.domElement.classList.add('Info-label')
        this.container.appendChild(this.labelRenderer.domElement);

    }

    show(nodeName, labelText, dotPosition) {

        if (!nodeName) return;

        let currentNode = this.viewer.content.getObjectByName(nodeName);
        if (!currentNode) {
            console.warn(`无法找到当前id为: ${nodeName} 的节点`);
            return
        };


        window.addEventListener('resize', onWindowResize.bind(this));

        let newCss2dLabel = addCss2dLabel(currentNode, labelText, dotPosition);
        this.labelAll.push(newCss2dLabel)
        this.viewer.scene.add(newCss2dLabel.object3D);

        if (!this.isAnimate) {
            this.isAnimate = true;
            animate.apply(this);
        };

        return {
            type: 'labelDom',
            nodeName: nodeName,
            id: newCss2dLabel.id,
            position: dotPosition
        }

    }

    addLabel3d(position, option) {

        if (!position) {
            console.error('addLabel3d: position不能为空');
            return;
        }

        let config = Object.assign({
            width: 1.7,
            height: 2,
            lineHeight: 1,
            lineWidth: 0.02,
            title: 'demo',
            background: null,
            showRange: [0, window.Infinity]  // 数组[0]为最小值， [1]为最大值--- 当相机与对象处于这段距离里时将会显示，其他距离将会隐藏

        }, option);
        if (!config.showRange[1]) config.showRange[1] = window.Infinity;

        if (!this.changeReferAngleEvent) {
            this.changeReferAngleEvent = changeReferAngle.bind(this);
            this.viewer.controls.addEventListener('change', this.changeReferAngleEvent);
        }

        //创建3d标签
        let label3d = new THREE.Object3D();
        label3d.name = 'label3d';
        let label3dInfo = {
            type: 'label3d',
            object3D: label3d,
            position: position,
            config
        }
        let labelPostion = new THREE.Vector3(...position);
        label3d.position.copy(labelPostion);

        this.labelAll.push(label3dInfo);

        let label3dMap = this.loadLabel3dBackground(config);


        // let label3dPanelPic = this.textureLoader.load( label3dPanel );
        // label3dPanelPic.encoding = this.viewer.renderer.outputEncoding;
        let labelGeometry = new THREE.PlaneBufferGeometry(config.width, config.height, 1);
        let labelMaterial = new THREE.MeshBasicMaterial({
            // color: new THREE.Color('#000'),
            side: THREE.DoubleSide,
            // map: new THREE.CanvasTexture(panelCanvas),
            map: label3dMap,
            transparent: true,
            alphaTest: 0.45
        });
        let labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
        labelMesh.name = 'label3d-panel';

        labelMesh.position.y += config.lineHeight + config.height / 1.8;

        let lineGeometry = new THREE.PlaneBufferGeometry(config.lineWidth, config.lineHeight, 1);
        let lineMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            map: this.textureLoader.load(label3dLine),
            side: THREE.DoubleSide
        });
        let lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
        lineMesh.name = 'label3d-line';
        lineMesh.position.y += config.lineHeight / 2;

        label3d.add(lineMesh);
        label3d.add(labelMesh);
        this.viewer.scene.add(label3d);


        let returnLabel3dInfo = {
            type: 'label3d',
            id: label3d.id,
            position: position,
            ...config,
        }

        watchData.apply(this, [returnLabel3dInfo, label3dCallSet, label3dInfo]);

        if (!this.isAnimate) {
            this.isAnimate = true;
            animate.apply(this);
        }

        return returnLabel3dInfo;
    }

    hide(labelId) {
        let that = this;

        if (!labelId) {
            this.hideAll()
            return
        }

        function rmoveDomAndMesh(rmoveTarget) {

            that.viewer.scene.remove(rmoveTarget.object3D);

            if (rmoveTarget.labelEl) that.labelRenderer.domElement.removeChild(rmoveTarget.labelEl);
            if (rmoveTarget.dotEl) that.labelRenderer.domElement.removeChild(rmoveTarget.dotEl);

        }

        this.labelAll = this.labelAll.filter((item) => {
            if (item.object3D.id == labelId) rmoveDomAndMesh(item);
            return item.object3D.id != labelId;
        });

    }

    hideAll() {

        this.isAnimate = false;
        window.removeEventListener('resize', onWindowResize.bind(this));

        this.labelAll.forEach(labelObject => {
            this.viewer.scene.remove(labelObject.object3D);
            if (labelObject.labelEl) this.labelRenderer.domElement.removeChild(labelObject.labelEl);
            if (labelObject.dotEl) this.labelRenderer.domElement.removeChild(labelObject.dotEl);
            // this.labelRenderer.domElement.removeChild(labelObject.dotEl)
        });

        this.labelAll = [];

        if (this.changeReferAngleEvent) {
            this.viewer.controls.removeEventListener('change', this.changeReferAngleEvent);
            this.changeReferAngleEvent = null;
        }

    }

    loadLabel3dBackground(config) {

        let label3dMap = null

        if (config.background) {
            // debugger
            if (isElement(config.background) && config.background.tagName === 'CANVAS') {
                label3dMap = new THREE.CanvasTexture(config.background)

            } else {
                label3dMap = this.textureLoader.load(config.background);
            }
            label3dMap.encoding = this.viewer.renderer.outputEncoding;

        } else {

            let panelCanvas = newPanelCanvas(config.title, config.width * 100, config.height * 100);
            label3dMap = new THREE.CanvasTexture(panelCanvas);
        }

        return label3dMap
    }


}

//partsName, pointName,value, state ='a1', type = 'b1',
function newPanelCanvas(title, widthSize, heightSize) {

    let fontSize = widthSize * 0.2;
    const ctx = document.createElement('canvas').getContext('2d');

    // measure how long the name will be
    const width = widthSize;
    const height = heightSize;
    ctx.canvas.width = width;
    ctx.canvas.height = height;

    ctx.fillStyle = '#f73b22';
    ctx.fillRect(0, 0, width, height);

    ctx.font = `${fontSize}px 	Microsoft YaHei`;
    ctx.fillStyle = 'white';
    let titleLeft = (width - ctx.measureText(title).width) / 2;
    let titletop = height / 2;
    ctx.fillText(title, titleLeft, titletop);

    return ctx.canvas;
}

function addCss2dLabel(currentNode, labelContent, dotPosition) {

    let labelContainer = createElement('DIV', 'label-container');
    let labelEl = null;


    if (isElement(labelContent)) {
        labelContent.classList.add('info-label-ui');
        labelEl = labelContent;
    } else {
        labelEl = createElement('DIV', 'info-label-ui', `<div class="info-label-text" > ${labelContent}</div>`);
    }

    labelContainer.appendChild(labelEl);

    let labelDot = createElement('DIV', 'info-label-dot', '<div class="info-label-mindot"> </div> <div class="info-label-maxdot"> </div>');

    let nodeBox = getNodeBox3(currentNode);
    let startPos = nodeBox.getCenter(new THREE.Vector3());
    if (dotPosition) {
        startPos.x = dotPosition.x;
        startPos.y = dotPosition.y;
        startPos.z = dotPosition.z;
    }
    let toEndDistance = nodeBox.max.clone().sub(startPos);
    let moveDistance = toEndDistance.multiplyScalar(-0.4); //这里multiplyScalar里面的数是一个距离的系数，负数是指向endPos的坐标向startPos的方向退后，而正数是向前进
    let endPos = nodeBox.max.clone().add(moveDistance);

    const points = [];
    points.push(startPos.clone());
    points.push(endPos.clone());

    let labelOject = new CSS2DObject(labelContainer);
    let labelDotNode = new CSS2DObject(labelDot);
    labelOject.name = 'labelOject';
    labelDotNode.name = 'labelDotNode';


    let lineMaterial = new THREE.LineBasicMaterial({
        color: 0xFFFF00,
        depthTest: false, //为了让线浮于所有物体上方设置这个值
    });

    let lineGeometry = new THREE.BufferGeometry().setFromPoints([]);
    let labelLine = new THREE.Line(lineGeometry, lineMaterial);
    labelLine.renderOrder = 10 //为了让线浮于所有物体上方设置这个值

    labelLine.geometry.setFromPoints(points);
    labelOject.position.copy(endPos);
    labelDotNode.position.copy(startPos);
    labelLine.name = 'labelLine';

    let css2dLabel = new THREE.Group();
    css2dLabel.name = 'css2dLabel'

    css2dLabel.add(labelOject);
    css2dLabel.add(labelDotNode);
    css2dLabel.add(labelLine);

    return { labelEl: labelContainer, dotEl: labelDot, object3D: css2dLabel, nodeName: currentNode.name, type: 'labelDom' };

}


function getNodeBox3(node) {

    let box = new THREE.Box3();
    box.expandByObject(node);
    return box;

}

function animate() {

    if (!this.isAnimate || this.labelAll.length === 0) return


    this.labelRenderer.render(this.viewer.scene, this.viewer.defaultCamera);

    this.labelAll.forEach(labelObject => {

        if (labelObject.type === 'labelDom') {
            adjustDomLabelDirection(labelObject, this);
        } else if (labelObject.type === 'label3d') {
            let distanceFromCamera = this.viewer.defaultCamera.position.distanceTo(labelObject.object3D.position);
            let isShow = labelObject.config.showRange[0] <= distanceFromCamera && distanceFromCamera <= labelObject.config.showRange[1]; //showRange[0] 为最小值 ，showRange[1]最大值
            labelObject.object3D.visible = isShow;
            labelObject.object3D.rotation.copy(this.referAngleObject.rotation);

        }

    })


    requestAnimationFrame(() => {
        animate.apply(this);
    });

}

function adjustDomLabelDirection(labelObject, infoLabel) {

    let rendererWidth = getElementWidth(infoLabel.labelRenderer.domElement);
    let rendererHeigth = getElementHeight(infoLabel.labelRenderer.domElement);
    let startPos = labelObject.object3D.children[0].position.clone(); //部件对象的位置 
    let endPos = labelObject.object3D.children[1].position.clone(); //圆点对象的位置 

    // 090101 这段代码主要功能为了美观，让标签左对齐还是右对齐
    //090101 step-1 获取标签的开始位置和结束位置 并转成屏幕坐标
    let screenStartPos = toScreenPosition(startPos, infoLabel.viewer.defaultCamera, rendererWidth, rendererHeigth);

    let screenEndPos = toScreenPosition(endPos, infoLabel.viewer.defaultCamera, rendererWidth, rendererHeigth);

    // 090101 step-2 获开始位置到结束位置的方向
    let orientation_x = (screenStartPos.x - screenEndPos.x) > 0 ? true : false;

    // 090101 step-3 根据方向让标签默认左对齐还是右对齐
    if (infoLabel.prevOrientation_x !== orientation_x) {

        if (orientation_x) {
            labelObject.labelEl.classList.remove('label-align-right');
        } else {
            labelObject.labelEl.classList.add('label-align-right');
        }
        infoLabel.prevOrientation_x = orientation_x;
    };

}

function onWindowResize() {

    this.labelRenderer.setSize(getElementWidth(this.container), getElementHeight(this.container));

}


//屏幕坐标矢量转成屏幕坐标
function toScreenPosition(pos, camera, width, height) {
    var vector = pos.project(camera);

    vector.x = (vector.x + 1) / 2 * width;
    vector.y = -(vector.y - 1) / 2 * height;
    return {
        x: vector.x,
        y: vector.y,
    };
};

function isElement(obj) {
    try {
        //Using W3 DOM2 (works for FF, Opera and Chrome)
        return obj instanceof HTMLElement;
    }
    catch (e) {
        //Browsers not supporting W3 DOM2 don't have HTMLElement and
        //an exception is thrown and we end up here. Testing some
        //properties that all elements have (works on IE7)
        return (typeof obj === "object") &&
            (obj.nodeType === 1) && (typeof obj.style === "object") &&
            (typeof obj.ownerDocument === "object");
    }
}

//用于监控数据是否有改动--仅测试用
function watchData(object, callObjce, ...otheObject) {

    for (let property in callObjce) {

        let currentObject = object[property]
        if (currentObject) {

            Object.defineProperty(object, property, {
                get: () => {
                    return this[`_${property}`];
                },
                set: (newVal) => {
                    this[`_${property}`] = newVal
                    callObjce[property].apply(this, [object, newVal, ...otheObject])
                }
            });
        };
    }
}

//类似vue的watch--仅测试用
let label3dCallSet = {

    title: function (object, newVal, label3dInfo) {
        console.log(`当前为title:`, newVal, label3dInfo, this);
    },

    background: function (object, newVal, label3dInfo) {

        let label3dMap = this.loadLabel3dBackground(object);
        let label3dPanel = label3dInfo.object3D.getObjectByName("label3d-panel")
        label3dPanel.material.map = label3dMap;
    }

}

function changeReferAngle() {
    let cameraPos = this.viewer.defaultCamera.position.clone()
    this.referAngleObject.lookAt(cameraPos.x, this.referAngleObject.position.y, cameraPos.z);
}

export default InfoLabel;