import { createElement, getElementHeight, getElementWidth } from "../utility/dom-helper";
import { TWEEN } from "three/examples/jsm/libs/tween.module.min.js";

export class ToolBar {
    constructor(el, opt) {
        this.el = el;
        this.isCollapse = false;
        this.htmlNode = {
            toobarFold: null,
            btnArea: null
        };
        this.btnAreaDefaultStyle = {
            height: null,
            width: null
        }
        this.opt = Object.assign({
            startUpWireframe: (val) => { },
            showStructureTree: (val) => { },
            showTransformMode: (val) => { },
            showInfoLabel: (val) => { },
            selectAllMode: (val) => { },
            showOrDelPart: (val) => { },
            showRotationMode: (val) => { },
            showScaleMode: (val) => { },
            showMaterialMode: (val) => { },
            excuteTween: (val) => { },
        }, opt || {});

        this.init();
    }

    init() {

        const viewerBbar = createElement('DIV', 'viewer-bbar');
        const domEl = createElement('DIV', 'btn-area');
        this.htmlNode.viewerBbar = viewerBbar;
        this.htmlNode.btnArea = domEl;

        const toobarFoldHtml = `
          <div class="toobar-fold-btn">
           <div class="btn">
          </div>
        `
        const toobarFold = createElement('DIV', 'toobar-fold normal-height', toobarFoldHtml);
        this.htmlNode.toobarFold = toobarFold;
        this.el.appendChild(viewerBbar);
        viewerBbar.appendChild(toobarFold);
        viewerBbar.appendChild(domEl);

        const that = this;
        toobarFold.addEventListener('click', function () {
            that.collapseToolbar();
        })

        this.createBtn(domEl);
    }

    createBtn(domEl) {
        const that = this;
        const structureBtn = createElement('BUTTON', '');
        structureBtn.setAttribute("title", "结构")
        structureBtn.classList.add("structureBtn");
        //todo
        structureBtn.addEventListener('click', () => {
            if (structureBtn.classList == 'structureBtn activate') {
                structureBtn.classList.remove('activate');
                that.opt.showStructureTree(false);
            } else {
                structureBtn.classList.add('activate');
                that.opt.showStructureTree(true);
            }
        })
        domEl.appendChild(structureBtn);

        const selectedAllToolBtn = createElement('BUTTON', '');
        selectedAllToolBtn.setAttribute("title", "全选")
        selectedAllToolBtn.classList.add("selectedAllToolBtn");
        selectedAllToolBtn.addEventListener('click', () => {
            if (selectedAllToolBtn.classList == 'selectedAllToolBtn activate') {
                selectedAllToolBtn.classList.remove("activate");
                that.opt.selectAllMode(false);
            } else {
                selectedAllToolBtn.classList.add("activate");
                that.opt.selectAllMode(true);
            }
        });
        domEl.appendChild(selectedAllToolBtn);

        const showPartBtn = createElement('BUTTON', '');
        showPartBtn.setAttribute("title", "显隐")
        showPartBtn.classList.add("showPartBtn");
        showPartBtn.addEventListener('click', () => {
            if (showPartBtn.classList == 'showPartBtn activate') {
                showPartBtn.classList.remove("activate");
                that.opt.showOrDelPart(false);
            } else {
                showPartBtn.classList.add("activate");
                that.opt.showOrDelPart(true);
            }
        });
        domEl.appendChild(showPartBtn);


        const transformToolBtn = createElement('BUTTON', '');
        transformToolBtn.setAttribute("title", "移动")
        transformToolBtn.classList.add("transformToolBtn");
        transformToolBtn.addEventListener('click', () => {
            if (transformToolBtn.classList == 'transformToolBtn activate') {
                transformToolBtn.classList.remove("activate");
                that.opt.showTransformMode(false);
            } else {
                transformToolBtn.classList.add("activate");
                that.opt.showTransformMode(true);
            }
        });
        domEl.appendChild(transformToolBtn);


        const rotationPartBtn = createElement('BUTTON', '');
        rotationPartBtn.setAttribute("title", "旋转")
        rotationPartBtn.classList.add("rotationPartBtn");
        rotationPartBtn.addEventListener('click', () => {
            if (rotationPartBtn.classList == 'rotationPartBtn activate') {
                rotationPartBtn.classList.remove("activate");
                that.opt.showRotationMode(false);
            } else {
                rotationPartBtn.classList.add("activate");
                that.opt.showRotationMode(true);
            }
        });
        domEl.appendChild(rotationPartBtn);


        const zoomPartBtn = createElement('BUTTON', '');
        zoomPartBtn.setAttribute("title", "缩放")
        zoomPartBtn.classList.add("zoomPartBtn");
        zoomPartBtn.addEventListener('click', () => {
            if (zoomPartBtn.classList == 'zoomPartBtn activate') {
                zoomPartBtn.classList.remove("activate");
                that.opt.showScaleMode(false);
            } else {
                zoomPartBtn.classList.add("activate");
                that.opt.showScaleMode(true);
            }
        });
        domEl.appendChild(zoomPartBtn);

        const materialBtn = createElement('BUTTON', '');
        materialBtn.setAttribute("title", "材质")
        materialBtn.classList.add("materialBtn");
        materialBtn.addEventListener('click', () => {
            if (materialBtn.classList == 'materialBtn activate') {
                materialBtn.classList.remove("activate");
                that.opt.showMaterialMode(false);
            } else {
                materialBtn.classList.add("activate");
                that.opt.showMaterialMode(true);
            }
        });
        domEl.appendChild(materialBtn);

        const scutcheonBtn = createElement('BUTTON', '');
        scutcheonBtn.setAttribute("title", "标签")
        scutcheonBtn.classList.add("scutcheonBtn");
        scutcheonBtn.addEventListener('click', () => {
            if (scutcheonBtn.classList == 'scutcheonBtn activate') {
                scutcheonBtn.classList.remove("activate");
                that.opt.showInfoLabel(false);
            } else {
                scutcheonBtn.classList.add("activate");
                that.opt.showInfoLabel(true);
            }
        });
        domEl.appendChild(scutcheonBtn);

        // const explodeBtn = createElement('BUTTON', '');
        // explodeBtn.setAttribute("title", "分解设备")
        // explodeBtn.classList.add("explodeBtn");
        // //todo
        // explodeBtn.addEventListener('click', () => {
        //     if (explodeBtn.classList == 'explodeBtn activate') {
        //         explodeBtn.classList.remove('activate');
        //     } else {
        //         explodeBtn.classList.add('activate');
        //     }
        // })
        // domEl.appendChild(explodeBtn);

        // const sliceBtn = createElement('BUTTON', '');
        // sliceBtn.setAttribute("title", "剖切设备")
        // sliceBtn.setAttribute("class", "sliceBtn");
        // //todo
        // sliceBtn.addEventListener('click', () => {
        //     if (sliceBtn.classList == 'sliceBtn activate') {
        //         sliceBtn.classList.remove('activate');
        //     } else {
        //         sliceBtn.classList.add('activate');
        //     }
        // })
        // domEl.appendChild(sliceBtn);

        // const measurePointBtn = createElement('BUTTON', '');
        // measurePointBtn.setAttribute("class", 'measurePointBtn');
        // measurePointBtn.setAttribute("title", "测点");
        // //todo
        // measurePointBtn.addEventListener('click', () => {
        //     if (measurePointBtn.classList == 'measurePointBtn activate') {
        //         measurePointBtn.classList.remove('activate');
        //     } else {
        //         measurePointBtn.classList.add('activate');
        //     }
        // })
        // domEl.appendChild(measurePointBtn);

        // const healthDegree = createElement('BUTTON', '');
        // healthDegree.setAttribute("class", 'healthDegreeBtn');
        // healthDegree.setAttribute("title", "健康度");
        // //todo
        // healthDegree.addEventListener('click', () => {
        //     if (healthDegree.classList == 'healthDegreeBtn activate') {
        //         healthDegree.classList.remove('activate');
        //     } else {
        //         healthDegree.classList.add('activate');
        //     }
        // })
        // domEl.appendChild(healthDegree);

        // const wireframeBtn = createElement('BUTTON', '');
        // wireframeBtn.setAttribute("class", 'wireframeBtn');
        // wireframeBtn.setAttribute("title", "线框模式");
        // //todo
        // wireframeBtn.addEventListener('click', () => {
        //     if (wireframeBtn.classList == 'wireframeBtn activate') {
        //         wireframeBtn.classList.remove('activate');
        //         that.opt.startUpWireframe(false);
        //     } else {
        //         wireframeBtn.classList.add('activate');
        //         that.opt.startUpWireframe(true);
        //     }
        // })
        // domEl.appendChild(wireframeBtn);

        // const SettingBtn = createElement('BUTTON', '');
        // SettingBtn.setAttribute('title', '场景设置')
        // SettingBtn.classList.add("SettingBtn");
        // //todo
        // SettingBtn.addEventListener('click', () => {
        //     if (SettingBtn.classList == 'SettingBtn activate') {
        //         SettingBtn.classList.remove('activate');
        //     } else {
        //         SettingBtn.classList.add('activate');
        //     }
        // })
        // domEl.appendChild(SettingBtn);

        const CaremaResetBtn = createElement('BUTTON', '');
        CaremaResetBtn.setAttribute('title', "重置模型");
        CaremaResetBtn.classList.add("CaremaResetBtn");
        //todo
        CaremaResetBtn.addEventListener('click', () => {
            if (CaremaResetBtn.classList == 'CaremaResetBtn activate') {
                CaremaResetBtn.classList.remove('activate');
                this.opt.excuteTween(false);
            } else {
                CaremaResetBtn.classList.add('activate');
                this.opt.excuteTween(true);
            }
        })
        domEl.appendChild(CaremaResetBtn);
    }

    collapseToolbar() {

        let tweenOneParam = null;
        let tweenTwoParam = null;
        let btnAreaDefaultHeight = 60;

        if (!this.isCollapse) {

            let btnAreaHeight = getElementHeight(this.htmlNode.btnArea);
            this.htmlNode.btnArea.style.height = `${btnAreaHeight}px`;
            this.htmlNode.btnArea.style.margin = '10px 0px';
            let btnAreaWidth = getElementWidth(this.htmlNode.btnArea);
            this.btnAreaDefaultStyle.width = `${btnAreaWidth}px`;
            this.btnAreaDefaultStyle.height = `${btnAreaHeight}px`;


            tweenOneParam = [
                { width: btnAreaWidth, opacity: 1 },
                { width: 0, opacity: 0 }
            ];
            this.htmlNode.viewerBbar.classList.add('shrink-state');

            if (btnAreaHeight > 60) {
                this.htmlNode.btnArea.style.margin = '0px';
                tweenTwoParam = [
                    { height: btnAreaHeight },
                    { height: btnAreaDefaultHeight }
                ];

            }
            this.collapseShrinkTween(200, tweenOneParam, tweenTwoParam);
            this.isCollapse = true;

        } else {

            let tweenOneParam = null;
            let tweenTwoParam = null;

            tweenOneParam = [
                { width: 0, opacity: 0 },
                { width: this.btnAreaDefaultStyle.width, opacity: 1 }
            ];

            if (this.btnAreaDefaultStyle.height > 60) {
                tweenTwoParam = [
                    { height: btnAreaDefaultHeight },
                    { height: this.btnAreaDefaultStyle.height }

                ];
            };
            this.htmlNode.viewerBbar.classList.remove('shrink-state');
            this.collapseShrinkTween(200, tweenOneParam, tweenTwoParam, false);
            this.isCollapse = false;

        }
    }

    collapseShrinkTween(time, tweenOneParam, tweenTwoParam) {
        console.log('tweenOneParam', tweenOneParam, tweenTwoParam)

        let foldTweenOne, foldTweenTwo;
        foldTweenOne = new TWEEN.Tween(tweenOneParam[0])
            .to(tweenOneParam[1], time)
            .onUpdate((object) => {
                this.htmlNode.btnArea.style.width = `${object.width}px`;
                this.htmlNode.btnArea.style.opacity = object.opacity;
            })
            .onComplete(() => {

                if (!this.isCollapse) {
                    this.htmlNode.btnArea.removeAttribute('style');
                }
            })
            .easing(TWEEN.Easing.Quadratic.Out)

        if (tweenTwoParam) {

            foldTweenTwo = new TWEEN.Tween(tweenTwoParam[0])
                .to(tweenTwoParam[1], time - 150)
                .onUpdate((object) => {
                    this.htmlNode.btnArea.style.height = object.height;
                })
                .easing(TWEEN.Easing.Quadratic.Out)
        }

        foldTweenOne.start();

        if (foldTweenTwo) {

            foldTweenTwo.delay(100);
            foldTweenTwo.start();

        }

    }
}