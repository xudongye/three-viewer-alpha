import {
    AmbientLight,
    AnimationMixer,
    AxesHelper,
    Box3,
    Cache,
    CubeTextureLoader,
    DirectionalLight,
    GridHelper,
    HemisphereLight,
    LinearEncoding,
    LoaderUtils,
    LoadingManager,
    PMREMGenerator,
    PerspectiveCamera,
    RGBFormat,
    Scene,
    Group,
    Mesh,
    SkeletonHelper,
    UnsignedByteType,
    Vector3,
    Vector2,
    Raycaster,
    WebGLRenderer,
    sRGBEncoding,
    Color,
    PlaneGeometry,
    ShadowMaterial,
    MeshBasicMaterial,
    TextureLoader,
    PlaneBufferGeometry,
    Matrix4,
    BoxGeometry,
    Box3Helper,
    BoxHelper
} from 'three';
import { GUI } from 'dat.gui';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { createElement, getElementWidth, getElementHeight } from '../utility/dom-helper';
import '../scss/three-viewer.scss';
import { ToolBar } from './ToolBar';
import { SelectionProxy } from './SelectionProxy';
import { StructureTree } from './StructureTree';
import groundTextureAlphamapPic from '../images/ground_scene.png';
import TransformMode from './TransformMode';
import InfoLabel from './InfoLabel';
import RotationMode from './RotationMode';
import ScaleMode from './ScaleMode';
import AdminMaterial from './AdminMaterial';
import TweenProxy from './TweenProxy';
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min';
import { stringify } from 'query-string';

// var createBackground = require('three-vignette-background');

const DEFAULT_CAMERA = '[default]';

export class Viewer {
    constructor(el, options) {
        this.el = el;
        this.options = options;
        this.envhdrUrl = '/environment/venice_sunset_1k.hdr'
        this.state = {
            structureTree: false,
            wireframe: false,
            background: false,
            addLights: true,
            exposure: 1.0,
            textureEncoding: 'sRGB',
            ambientIntensity: 0.3,
            ambientColor: 0xFFFFFF,
            directIntensity: 0.8 * Math.PI, // TODO(#116)
            directColor: 0xFFFFFF,
            bgColor1: '#ffffff',
            bgColor2: '#353535',
            playbackSpeed: 1,
            actionStates: {},
            firstExpandScalar: 0.1,
            isTransformObj: false,
            isRotationObj: false,
            isScaleObj: false,
            isSelectAll: false,
            isShowInfoLabel: false,
            customColor: '#ffae23',
            customOpacity: 1
        }
        this.pickedObject = null;

        this.maxSize = null; //包围盒最大的模型

        this.lights = [];
        this.content = new Group();
        this.content.name = 'sceneRoot';
        this.mixer = null;
        this.clips = [];
        this.gui = null;
        this.prevTime = 0;
        this.gridHelper = null;

        this.stats = new Stats();
        [].forEach.call(this.stats.dom.children, (child) => (child.style.display = ''));
        this.stats.dom.style.position = 'absolute';
        this.stats.dom.style.top = 'unset';
        this.stats.dom.style.bottom = '0px';
        el.appendChild(this.stats.dom);

        this.scene = new Scene();
        this.selectionProxy = new SelectionProxy(this.scene);
        this.raycaster = new Raycaster();

        const fov = 45;
        this.defaultCamera = new PerspectiveCamera(fov, el.clientWidth / el.clientHeight, 0.01, 1000);
        this.activeCamera = this.defaultCamera;

        this.scene.add(this.defaultCamera);
        this.renderer = window.renderer = new WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.physicallyCorrectLights = true;
        this.renderer.outputEncoding = sRGBEncoding;
        this.renderer.setClearColor(0xffffff, 0);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(el.clientWidth, el.clientHeight);

        this.pmremGenerator = new PMREMGenerator(this.renderer);
        this.pmremGenerator.compileEquirectangularShader();

        this.controls = new OrbitControls(this.defaultCamera, this.renderer.domElement);
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = -10;
        this.controls.screenSpacePanning = true;

        this.el.appendChild(this.renderer.domElement);

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
        window.addEventListener('resize', this.resize.bind(this), false);

        this.init();
    }

    init() {
        this.updateLights();
        this.updateEnvironment();
        this.updateTextureEncoding();
        this.addGUI();

        this.toolbar = new ToolBar(this.el, {
            startUpWireframe: (val) => { this.setWireframe(val) },
            showStructureTree: (val) => { this.showStructureTree(val) },
            showTransformMode: (val) => { this.showTransformMode(val) },
            showInfoLabel: (val) => { this.showInfoLabel(val) },
            selectAllMode: (val) => { this.selectAllMode(val) },
            showOrDelPart: (val) => { this.showOrDelPart(val) },
            showRotationMode: (val) => { this.showRotationMode(val) },
            showScaleMode: (val) => { this.showScaleMode(val) },
            showMaterialMode: (val) => { this.showMaterialMode(val) },
            excuteTween: (val) => { this.excuteTween(val) }
        });
        this.structureTree = new StructureTree(this.el, {
            content: this.content,
            showStructureTree: (val) => { this.showStructureTree(val) },
            seletedByUUId: (id) => { this.seletedByUUId(id) },
            clearSelection: () => { this.clearSelection() }
        })
        this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this), false);
        this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this), false);
        this.renderer.domElement.addEventListener('wheel', this.onWheel.bind(this), false);

    }


    onMouseDown(e) {
        // console.log("鼠标按下", e)
        this.oX = e.pageX;
        this.oY = e.pageY;
    }

    onMouseUp(e) {
        let _this = this;
        // console.log("鼠标弹起", e)
        this.fX = e.pageX;
        this.fY = e.pageY;
        if (Math.abs(this.fX - this.oX) < 2 && Math.abs(this.fY - this.oY) < 2) {
            _this.raycast.apply(_this, [e]);
        }
    }

    onWheel(e) {
        // console.log("滚轮事件", e)
    }

    /**
     * 
     * @param {基于包围盒定位地坪} positionY 
     */
    addGridHelper(box) {

        const ox1 = box.max.x;
        const oy1 = box.max.y;
        const oz1 = box.max.z;

        const ox2 = box.min.x;
        const oy2 = box.min.y;
        const oz2 = box.min.z;

        var baseSize = 1;
        if (Math.abs(ox1 - ox2) > Math.abs(oz1 - oz2)) {
            baseSize = Math.abs(ox1 - ox2);
        } else {
            baseSize = Math.abs(oz1 - oz2);
        }

        this.gridHelper = new GridHelper(baseSize * 40, 100, 0x000000, 0x000000);
        this.gridHelper.material.opacity = 0.2;
        this.gridHelper.material.transparent = true;
        this.gridHelper.position.y = oy2;
        this.scene.add(this.gridHelper);

        new TextureLoader().load(
            groundTextureAlphamapPic,
            (texture) => {
                const ground = new Mesh(new PlaneBufferGeometry(baseSize * 2, baseSize * 2), new MeshBasicMaterial({ map: texture }));
                ground.material.transparent = true;
                // ground.receiveShadow = true;
                ground.rotation.x = - Math.PI / 2;
                ground.position.y = oy2;
                this.scene.add(ground);
            }
        )

    }

    /**
     * 屏幕点击事件
     * @param {*} e 
     * @returns 
     */
    raycast(e) {
        const { clientHeight, clientWidth } = this.el.parentElement;
        let mouse = new Vector2();
        mouse.x = (e.offsetX / clientWidth) * 2 - 1;
        mouse.y = -(e.offsetY / clientHeight) * 2 + 1;
        let selectNode = [];
        let intersects = [];
        let scene = this.scene;
        let raycaster = this.raycaster;
        raycaster.setFromCamera(mouse, this.activeCamera);
        scene.children.map((item) => {
            if (item instanceof Group) {
                item.children.map((node) => {
                    selectNode.push(node);
                })
            }
        });
        if (selectNode) {
            intersects = raycaster.intersectObjects(selectNode, true);
        }
        this.proxyClear();
        if (intersects.length > 0) {
            let firstVisibleObjectIndex = -1;
            for (var i = 0, len = intersects.length; i < len; i++) {
                if (intersects[i].object && intersects[i].object.visible == true) {
                    firstVisibleObjectIndex = i;
                    this.currentModeName = intersects[i].object.name;
                    this.currentModePosition = intersects[i].object.position;
                    this.currentCameraLookAt = this.activeCamera.position;
                    console.log('点击部件：', intersects[i].object);
                    console.log('相机位置', [this.activeCamera.position.x, this.activeCamera.position.y, this.activeCamera.position.z]);
                    break;
                }
            }

            if (firstVisibleObjectIndex >= 0 && intersects[firstVisibleObjectIndex].object && intersects[firstVisibleObjectIndex].object.uuid) {
                let pickedObject = intersects[firstVisibleObjectIndex].object;
                console.warn("点击位置：", [intersects[firstVisibleObjectIndex].point.x, intersects[firstVisibleObjectIndex].point.y, intersects[firstVisibleObjectIndex].point.z]);
                if (this.pickedObject && this.pickedObject == pickedObject) {
                    return;
                }
                this.pickedObject = pickedObject;
                this.createProxy();
            }
        }
    }

    createProxy() {
        this.state.isSelectAll ? this.selectedRoot(this.pickedObject) : this.selectionProxy.create(this.pickedObject);
        if (this.transformMode && this.state.isTransformObj) {
            this.transformMode.enter(this.pickedObject);
        }
        if (this.infoLabel && this.state.isShowInfoLabel) {
            let labelInfo = this.pickedObject.children.length > 0 ?
                this.pickedObject.children[0].children[0] : this.pickedObject;
            this.infoLabel.show(labelInfo.name, labelInfo.name);
        }
        if (this.rotationMode && this.state.isRotationObj) {
            this.rotationMode.create(this.pickedObject);
        }
        if (this.scaleMode && this.state.isScaleObj) {
            this.scaleMode.create(this.pickedObject);
        }
        console.log("选中模型：", this.pickedObject.name)
    }

    proxyClear() {
        this.selectionProxy.clear();
        if (this.transformMode && this.state.isTransformObj) {
            this.transformMode.exit();
        }
        if (this.scaleMode && this.state.isScaleObj) {
            this.scaleMode.exit();
        }
        if (this.infoLabel && this.state.isShowInfoLabel) {
            this.infoLabel.hideAll();
        }
    }


    gltfLoadCompleted() {
        const box = new Box3().setFromObject(this.content);
        const size = box.getSize(new Vector3()).length();
        const center = box.getCenter(new Vector3());

        this.gridHelper ? '' : this.addGridHelper(box);

        this.controls.reset(this.content, this.clips);

        this.content.position.x += (this.content.position.x - center.x);
        this.content.position.y += 0;
        this.content.position.z += (this.content.position.z - center.z);

        this.controls.maxDistance = size * 10;
        this.defaultCamera.near = size / 100;
        this.defaultCamera.far = size * 100;
        this.defaultCamera.updateProjectionMatrix();

        if (this.options.cameraPosition) {

            this.defaultCamera.position.fromArray(this.options.cameraPosition);
            this.defaultCamera.lookAt(new Vector3());

        } else {

            this.defaultCamera.position.copy(center);
            this.defaultCamera.position.x += size / 1.6;
            this.defaultCamera.position.y += size / 4.0;
            this.defaultCamera.position.z += size / 1.6;
            this.defaultCamera.lookAt(center);

        }

        this.setCamera(DEFAULT_CAMERA);

        this.controls.saveState();

        this.state.addLights = true;

        this.content.traverse((node) => {
            if (node.isLight) {
                this.state.addLights = false;
            } else if (node.isMesh) {
                // TODO(https://github.com/mrdoob/js/pull/18235): Clean up.
                node.material.depthWrite = !node.material.transparent;
            }
        });

        window.content = this.content;
        console.info('[glTF Viewer] Scene exported as `window.content`.');
        // this.printGraph(this.content);

        this.scene.add(this.content);

        this.playAllClips();
        this.adminMaterial = new AdminMaterial(this);
        this.tweenProxy = new TweenProxy(this);
    }

    /**
     * 内置动画自动播放
     */
    playAllClips() {
        this.clips.forEach((item) => {
            item.forEach((val) => {
                this.mixer.timeScale = this.state.playbackSpeed;
                this.mixer.clipAction(val).reset().play();
                this.state.actionStates[val.name] = true;
            })
        })
    }

    /**
     * 清除选中部件
     */
    clearSelection() {
        this.selectionProxy.clear();
        this.pickedObject = null;
    }

    /**
     * 
     * @param {通过uuid选中部件} uuid 
     */
    seletedByUUId(uuid) {
        let target = null;
        this.scene.traverse((child) => {
            if (child.uuid == uuid) {
                return target = child;
            }
        });
        if (target) {
            if (this.pickedObject) {
                this.selectionProxy.clear();
                if (this.transformMode) {
                    this.transformMode.exit();
                }
            }
            if (target.children.length > 0) {
                target.traverse((val) => {
                    if (val.isMesh) {
                        this.selectionProxy.create(val);
                    }
                });
            } else {
                this.selectionProxy.create(target);
            }
            this.pickedObject = target;
            if (this.transformMode && this.state.isTransformObj) {
                this.transformMode.enter(this.pickedObject);
            }
        }
    }

    selectedRoot(val) {
        let node = val;
        let uuid;
        while (node.parent != this.content) {
            node = node.parent;
            uuid = node.uuid;
        }
        this.seletedByUUId(uuid);
    }


    addGUI() {
        const gui = this.gui = new GUI({ autoPlace: false, width: 260, hideable: true });
        this.el.appendChild(this.gui.domElement);
        const displayFolder = gui.addFolder('显示');
        const envBackgroundCtrl = displayFolder.add(this.state, 'background');
        envBackgroundCtrl.onChange(() => this.updateEnvironment());
        const structureCtl = displayFolder.add(this.state, 'structureTree');
        structureCtl.onChange(() => { this.showStructureTree(this.state.structureTree) })
        const wireframeCtrl = displayFolder.add(this.state, 'wireframe');
        wireframeCtrl.onChange(() => this.setWireframe(this.state.wireframe));
        displayFolder.add(this.controls, 'autoRotate');

        const expandFolder = gui.addFolder("分解");
        const expandCtrl = expandFolder.add(this.state, 'firstExpandScalar', 0, 1);
        expandCtrl.onChange(() => this.expand());

        const opacityFolder = gui.addFolder("透明度");
        const opacityCtrl = opacityFolder.add(this.state, 'customOpacity', 0, 1);
        opacityCtrl.onChange(() => this.adminMaterial.setMaterialOpacity(this.pickedObject.material.id, this.state.customOpacity));

        const colorFolder = gui.addFolder("颜色");
        const colorCtrl = colorFolder.addColor(this.state, 'customColor');
        colorCtrl.onChange(() => this.adminMaterial.setMaterialColor(this.pickedObject.material.id, this.state.customColor));

    }

    /**
     * 设置线框模式
     * @param {是否展示线框模式}} val 
     */
    setWireframe(val) {
        const that = this;
        traverseMaterials(that.content, (material) => {
            material.wireframe = val;
        })
    }

    /**
     * 
     * @param {bol是否显示模型结构树} val 
     */
    showStructureTree(val) {
        const structureObj = document.querySelector('.viewer-structure');
        if (val && structureObj) {
            structureObj.style.display = 'block';
        } else {
            structureObj.style.display = 'none';
        }
    }

    showTransformMode(val) {
        if (!this.transformMode) {
            this.transformMode = new TransformMode(this);
        }
        if (val) {
            this.transformMode.enter(this.pickedObject);
        } else {
            this.transformMode.exit();
        }
        this.state.isTransformObj = val;

    }

    excuteTween(val) {
        if (val) {
            this.tweenProxy.moveTween(this.pickedObject.name, [
                new Vector3(30, 0, -5),
                new Vector3(40, 0, -5),
            ]);
        } else {
            this.tweenProxy.moveTween(this.pickedObject.name, [
                new Vector3(0, 0, 20),
                new Vector3(0, 0, 40),
            ]);
        }

    }

    showMaterialMode(val) {
        if (!this.adminMaterial) {
            this.adminMaterial = new AdminMaterial(this);

        }
        if (val) {
            this.adminMaterial.enter();
        } else {
            this.adminMaterial.exit();
        }

    }

    showScaleMode(val) {
        if (!this.scaleMode) {
            this.scaleMode = new ScaleMode(this);
        }
        if (val && this.pickedObject) {
            this.scaleMode.create(this.pickedObject);
        } else {
            this.scaleMode.exit();
        }
        this.state.isScaleObj = val;
    }

    showRotationMode(val) {
        if (!this.rotationMode) {
            this.rotationMode = new RotationMode(this);
        }
        if (val && this.pickedObject) {
            this.rotationMode.create(this.pickedObject);
        } else {
            this.rotationMode.exit();
        }
        this.state.isRotationObj = val;
    }

    showOrDelPart(val) {
        if (!this.pickedObject) {
            return
        }
        this.pickedObject.visible = val;
        this.selectionProxy.hiddenProxy();
    }

    selectAllMode(val) {
        this.state.isSelectAll = val;
    }

    showInfoLabel(val) {
        if (!this.infoLabel) {
            this.infoLabel = new InfoLabel(this);
        }
        if (val && this.pickedObject) {
            this.infoLabel.show(this.pickedObject.name, this.pickedObject.name)
        } else {
            this.infoLabel.hideAll();
        }
        this.state.isShowInfoLabel = val;
    }


    resize() {
        const { clientHeight, clientWidth } = this.el.parentElement;
        this.defaultCamera.aspect = clientWidth / clientHeight;
        this.defaultCamera.updateProjectionMatrix();
        this.renderer.setSize(clientWidth, clientHeight);
    }

    updateLights() {
        const state = this.state;
        const lights = this.lights;

        if (state.addLights && !lights.length) {
            this.addLights();
        } else if (!state.addLights && lights.length) {
            this.removeLights();
        }

        this.renderer.toneMappingExposure = state.exposure;

        if (lights.length === 2) {
            lights[0].intensity = state.ambientIntensity;
            lights[0].color.setHex(state.ambientColor);
            lights[1].intensity = state.directIntensity;
            lights[1].color.setHex(state.directColor);
        }
    }

    removeLights() {
        this.lights.forEach((light) => light.parent.remove(light));
        this.lights.length = 0;
    }

    /**
     * 设置灯光组件
     */
    addLights() {
        const state = this.state;
        const light1 = new AmbientLight(state.ambientColor, state.ambientIntensity);
        light1.name = 'ambient_light';
        this.defaultCamera.add(light1);

        const light2 = new DirectionalLight(state.directColor, state.directIntensity);
        light2.position.set(0.5, 0, 0.866); // ~60º
        light2.name = 'main_light';
        this.defaultCamera.add(light2);
        this.lights.push(light1, light2);
    }

    /**
     * 加载高清环境贴图
     */
    updateEnvironment() {
        const environment = {
            id: 'venice-sunset',
            name: 'Venice Sunset',
            path: '/environment/venice_sunset_1k.hdr',
            format: '.hdr'
        };
        this.getCubeMapTexture(environment).then(({ envMap }) => {
            this.scene.environment = envMap;
            this.scene.background = this.state.background ? envMap : null;
        });
    }

    getCubeMapTexture(environment) {
        const { path } = environment;

        // no envmap
        if (!path) return Promise.resolve({ envMap: null });

        return new Promise((resolve, reject) => {

            new RGBELoader()
                .setDataType(UnsignedByteType)
                .load(path, (texture) => {

                    const envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
                    this.pmremGenerator.dispose();

                    resolve({ envMap });

                }, undefined, reject);

        });

    }

    updateTextureEncoding() {
        const encoding = this.state.textureEncoding === 'sRGB'
            ? sRGBEncoding
            : LinearEncoding;
        traverseMaterials(this.content, (material) => {
            if (material.map) material.map.encoding = encoding;
            if (material.emissiveMap) material.emissiveMap.encoding = encoding;
            if (material.map || material.emissiveMap) material.needsUpdate = true;
        });
    }

    /**
     * 渲染器定时执行
     * @param {定时执行} time 
     */
    animate(time) {
        requestAnimationFrame(this.animate);
        const dt = (time - this.prevTime) / 1000;
        this.controls.update();
        this.stats.update();
        this.mixer && this.mixer.update(dt);
        TWEEN.update();
        this.render();
        this.prevTime = time;
    }

    //渲染器执行
    render() {
        this.renderer.render(this.scene, this.activeCamera);
    }


    setClips(clips) {
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer.uncacheRoot(this.mixer.getRoot());
            this.mixer = null;
        }

        this.clips.push(clips);
        if (!this.clips.length) return;

        this.mixer = new AnimationMixer(this.content);
    }

    /**
      * @param {string} name
      */
    setCamera(name) {
        if (name === DEFAULT_CAMERA) {
            this.controls.enabled = true;
            this.activeCamera = this.defaultCamera;
        } else {
            this.controls.enabled = false;
            this.content.traverse((node) => {
                if (node.isCamera && node.name === name) {
                    this.activeCamera = node;
                }
            });
        }
    }


    /**
     * 
     * 模型爆炸
     */
    expand() {
        this.calcuExpand();
        this.content.traverse((node) => {
            if (!node.isMesh || !node.worldDir) return;
            node.position.copy(new Vector3().copy(node.userData.oldPs).add(new Vector3().copy(node.worldDir).multiplyScalar(this.state.firstExpandScalar)));
        })
    }

    /**
     * 爆炸前记录模型位置信息
     */
    calcuExpand() {
        const modelBox = new Box3().expandByObject(this.content);
        //计算模型的中心坐标，以这个为爆炸中心
        const modelPs = new Vector3().addVectors(modelBox.max, modelBox.min).multiplyScalar(0.5);
        const meshBox = new Box3();
        this.content.traverse((node) => {
            if (node.isMesh) {
                meshBox.setFromObject(node);
                //获取每个mesh的中心点，爆炸方向为爆炸的中心点指向mesh中心点
                var meshPs = new Vector3().addVectors(meshBox.max, meshBox.min).multiplyScalar(0.5);
                if (isNaN(meshPs.x)) return;
                //计算爆炸方向
                node.worldDir = new Vector3().subVectors(meshPs, modelPs).normalize();
                //保存初始坐标
                node.userData.oldPs = node.getWorldPosition(new Vector3());
            }
        })

    }

    setContent(object, clips) {
        this.content.add(object);
        this.setClips(clips);
        return this.content;
    }


    printGraph(node) {

        console.group(' <' + node.type + '> ' + node.name);
        node.children.forEach((child) => this.printGraph(child));
        console.groupEnd();

    }

    load(url, rootPath, assetMap) {
        const baseURL = LoaderUtils.extractUrlBase(url);
        return new Promise((resolve, reject) => {
            //正在加载的文件管理
            const manager = new LoadingManager();
            manager.setURLModifier((url, path) => {
                const normalizedURL = rootPath + decodeURI(url)
                    .replace(baseURL, '')
                    .replace(/^(\.?\/)/, '');
                if (assetMap.has(normalizedURL)) {
                    const blob = assetMap.get(normalizedURL);
                    const blobURL = URL.createObjectURL(blob);
                    blobURLs.push(blobURL);
                    return blobURL;
                }

                return (path || '') + url;
            });
            const loader = new GLTFLoader(manager)
                .setCrossOrigin('anonymous')
                .setDRACOLoader(
                    new DRACOLoader(manager).setDecoderPath('/libs/draco/')
                ).setMeshoptDecoder(MeshoptDecoder);
// debugger
            const blobURLs = [];
            loader.load(url, (gltf) => {
                const scene = gltf.scene || gltf.scenes[0];
                const clips = gltf.animations || [];
                let flieNameArray = url.split("/");
                let flieName = flieNameArray.slice(-1).toString();
                scene.name = flieName;
                // debugger
                if (!scene) {
                    throw new Error(
                        'This model contains no scene, and cannot be viewed here. However,'
                        + ' it may contain individual 3D resources.'
                    );
                }
                blobURLs.forEach(URL.revokeObjectURL);
                resolve({ scene: gltf.scene, clips: clips });
            }, undefined, reject);
        });

    }


    justifyLocation(val) {

        let backNodePosDistance = null;
        let object3d = val;
        let nodeOriginal = {
            position: object3d.position.clone(),
            scale: object3d.scale.clone(),
            rotation: object3d.rotation.clone()
        }

        if (object3d.userData["isSetCent"]) return  //这个现在主要是为了解决，因子node有旋转、大小、位移嵌套效果而产生的计算错误的问题--临时解决方案

        // object3d.position.set(0, 0, 0);
        object3d.scale.set(1, 1, 1);
        object3d.rotation.set(0, 0, 0);

        let nodeBox3 = new Box3();
        nodeBox3.expandByObject(object3d);
        let nodeCenterPos = new Vector3();
        nodeBox3.getCenter(nodeCenterPos);
        let nodePosition = object3d.position.clone();

        function getCurrentRootNode(node) {
            if (!node.parent) return null
            if (node.parent.type == "Scene") return node
            return getCurrentRootNode(node.parent);
        }

        let rootNode = getCurrentRootNode(object3d);
        let rootNodeBox = new Box3();
        rootNodeBox.expandByObject(rootNode);
        let rootNodeCenterPos = new Vector3();
        rootNodeBox.getCenter(rootNodeCenterPos);
        rootNodeCenterPos.y = 0  //先不调整y轴
        let rootNodeToOriginOffset = rootNodeCenterPos.sub(rootNode.position)
        // console.log( 'nodeCenterPos', nodeCenterPos, 'nodeOriginal.position',nodeOriginal.position)    

        // object3d.parent.add( boxHelper );       

        if (object3d.isMesh) {
            // e.geometry.boundingBox  获取在局部坐标系统中的该模型中心坐标，
            let nodeLocalCenter = new Vector3();
            if (object3d.geometry.boundingBox) {
                object3d.geometry.boundingBox.getCenter(nodeLocalCenter);
            } else {
                nodeLocalCenter.copy(object3d.geometry.boundingSphere.center)
            }

            //计算在局部坐标系统中的模型中心点的位置到原点的距离
            let distX = 0 - nodeLocalCenter.x;
            let distY = 0 - nodeLocalCenter.y;
            let distZ = 0 - nodeLocalCenter.z;

            //backOrigin 存储node原始数据, 以便于以后恢复。
            object3d.userData["backOrigin"] = {
                dist: [distX, distY, distZ],
                position: object3d.position.clone(),
            };

            //移动顶点坐标到原点的位置
            let backOriginMatrix4 = new Matrix4().makeTranslation(
                distX,
                distY,
                distZ
            );
            object3d.geometry.applyMatrix4(backOriginMatrix4);
            backNodePosDistance = new Vector3(-distX, -distY, -distZ);
            backNodePosDistance.applyMatrix4(object3d.matrix);
            backNodePosDistance.sub(nodeOriginal.position);
        };

        // object3d.position.copy( nodeOriginal.position );  
        object3d.scale.copy(nodeOriginal.scale);
        object3d.rotation.copy(nodeOriginal.rotation);


        if (!backNodePosDistance) {
            let scaleParent = new Vector3().setFromMatrixScale(object3d.parent.matrixWorld);
            let scaleMatrixInvert = new Matrix4().makeScale(scaleParent.x, scaleParent.y, scaleParent.z).invert();
            // console.log('进来了', scaleParent )

            backNodePosDistance = nodeCenterPos.clone().sub(nodeOriginal.position);

            if (object3d.userData.lastCenterPos) {
                lastCenterPos = object3d.userData.lastCenterPos.sub(nodeCenterPos);
            }

            backNodePosDistance.add(rootNodeToOriginOffset);
        }


        let orgNodeCenterPos, otheOffset;
        if (object3d.userData["isSetCent"]) {

            let orgNodeCenterPos = nodeCenterPos.clone();
            // let rotationMatrixInvert = new Matrix4().makeRotationFromEuler( nodeOriginal.rotation ).invert ();
            let rotationMatrixInvert = object3d.matrix.clone().invert()
            orgNodeCenterPos.applyMatrix4(rotationMatrixInvert);
            otheOffset = nodeCenterPos.sub(orgNodeCenterPos);
            otheOffset.sub(object3d.position);
            // backNodePosDistance.add( otheOffset )

        }

        object3d.position.add(backNodePosDistance);


        // console.log( 
        //     // 'lastCenterPos', lastCenterPos,
        //     'nodeOriginal.position', nodeOriginal.position,
        //     'object3d.position', object3d.position,
        //     'backNodePosDistance', backNodePosDistance, 
        //     // 'rootNodeToOriginOffset', rootNodeToOriginOffset, 
        //     'nodeCenterPos', nodeCenterPos,
        //     // 'orgNodeCenterPos', orgNodeCenterPos,
        //     // 'otheOffset', otheOffset

        //  )

        if (object3d.children.length > 0) {

            for (let i = 0; i < object3d.children.length; i++) {
                let nodeChildren = object3d.children[i];
                // nodeChildren.position.sub( rootNodeToOriginOffset );          
                nodeChildren.position.sub(backNodePosDistance);
            }

        };
        object3d.userData["lastCenterPos"] = nodeCenterPos.clone();
        object3d.userData["isSetCent"] = true;
        // debugger
        // console.log('object3d', object3d)



    }
}

function traverseMaterials(object, callback) {
    object.traverse((node) => {
        if (!node.isMesh) return;
        const materials = Array.isArray(node.material)
            ? node.material
            : [node.material];
        materials.forEach(callback);
    });
}








