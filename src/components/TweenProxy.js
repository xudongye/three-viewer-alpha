import * as THREE from "three";
import { Vector3 } from "three";
import { TWEEN } from "three/examples/jsm/libs/tween.module.min";

export default class TweenProxy {
    constructor(viewer) {
        this.viewer = viewer;
        this.content = viewer.content;
        this.selectionProxy = viewer.selectionProxy;
        this.camera = viewer.defaultCamera;
    }

    init() {

    }

    /**
     * 
     * @param {记录模型节点名称} nodeName 
     * @param {模型移动后坐标} overPosition[]
     * @returns 
     */
    moveTween(nodeName, overPosition) {
        // debugger
        let target = this.content.getObjectByName(nodeName);
        if (!target) {
            return
        }
        this.viewer.justifyLocation(target);
        // overPosition.unshift(target.position);    

        let endPosition = [ target.position.clone() ]
        
        overPosition.forEach( item  => {
            endPosition.push( target.position.clone().add( item ) ) 
        });
        
        let overPath = new THREE.CatmullRomCurve3(endPosition).getPoints(10000);

        new TWEEN.Tween({ pointindex: 0, currentTime: 0, })
            .to({
                pointindex: overPath.length - 2,
                currentTime: 2000,
            }, 2000)
            .easing(TWEEN.Easing.Linear.None)
            .onUpdate((e) => {
                console.log(e)
                let idx = parseInt(e.pointindex);
                target.position.x = overPath[idx].x;
                target.position.y = overPath[idx].y;
                target.position.z = overPath[idx].z;
                target.lookAt(overPath[idx + 1]);
            })
            .onComplete((e) => {
                console.log(e)
                this.selectionProxy.hiddenProxy();
            })
            .start();
    }

}