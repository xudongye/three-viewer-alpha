import * as THREE from "three";

class TransformProxy {

  constructor(object3d) {

    this.object3d = object3d;
    this.proxyObject = null;

    //newBoxProxy先临时放这里
    if (this.object3d.children.length > 0) {
      this.newBoxProxy()
    } else {
      this.init();
    }


  };

  init() {

    let material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.proxyObject = new THREE.Mesh(this.object3d.geometry.clone(), material);
    this.proxyObject.visible = false;
    this.proxyObject.name = 'transformProxy'

    this.object3d.parent.add(this.proxyObject);

    //li 0523 有一些模型因为有设置Rotation，所以新的顶点坐标也要先应用一个原node欧拉角变换
    let cancelRotationMatrix4 = new THREE.Matrix4().makeRotationFromEuler(
      this.object3d.rotation
    );

    this.proxyObject.geometry.applyMatrix4(cancelRotationMatrix4);

    // let box3 = new THREE.Box3();
    // box3.expandByObject(this.proxyObject )   

    // this.object3d.geometry.boundingBox  获取在局部坐标系统中的该模型中心坐标，
    let nodeBoxCenter = new THREE.Vector3();
    if (this.proxyObject.geometry.boundingBox) {
      this.proxyObject.geometry.boundingBox.getCenter(nodeBoxCenter);
    } else {
      nodeBoxCenter.copy(this.proxyObject.geometry.boundingSphere.center)
    }

    //计算在局部坐标系统中的模型中心点的位置到原点的距离
    let distX = 0 - nodeBoxCenter.x;
    let distY = 0 - nodeBoxCenter.y;
    let distZ = 0 - nodeBoxCenter.z;


    //移动顶点坐标到原点的位置
    let backOriginMatrix4 = new THREE.Matrix4().makeTranslation(
      distX,
      distY,
      distZ
    );
    this.proxyObject.geometry.applyMatrix4(backOriginMatrix4);

    this.proxyObject.position.x -= distX - this.object3d.position.x;
    this.proxyObject.position.y -= distY - this.object3d.position.y;
    this.proxyObject.position.z -= distZ - this.object3d.position.z;

  }

  newBoxProxy() {

    //使用box3用于计算this.object3d的长宽高以便于让boxProxy对齐this.object3d
    let object3dBox3 = new THREE.Box3;
    object3dBox3.expandByObject(this.object3d);

    let objectBoxCenter = new THREE.Vector3()
    object3dBox3.getCenter(objectBoxCenter);

    let proxyBoxSize = [
      Math.abs(object3dBox3.max.x - object3dBox3.min.x),
      Math.abs(object3dBox3.max.y - object3dBox3.min.y),
      Math.abs(object3dBox3.max.z - object3dBox3.min.z),
    ]

    let boxProxymat = new THREE.MeshBasicMaterial({ color: new THREE.Color('red'), transparent: false, opacity: 0.5 });
    let boxProxyGeometry = new THREE.BoxBufferGeometry(...proxyBoxSize);

    let boxProxy = new THREE.Mesh(boxProxyGeometry, boxProxymat);
    boxProxy.name = 'boxProxy';
    boxProxy.visible = false;

    //把boxProxy 放置到和this.object3d同一空间中，它的执行时机很关键，会影响到下面boxProxy的box3计算max,min的值时要参考的当前坐标系
    this.object3d.parent.add(boxProxy);

    //使用box3用于计算boxProxy的长宽高和对象中心点坐标
    let proxyBox3 = new THREE.Box3;
    proxyBox3.expandByObject(boxProxy);
    let proxyBox3Center = new THREE.Vector3()
    proxyBox3.getCenter(proxyBox3Center);

    //使用box3用于计算boxProxy的长宽高和对象中心点坐标
    boxProxy.position.x += (objectBoxCenter.x - proxyBox3Center.x);
    boxProxy.position.y += (objectBoxCenter.y - proxyBox3Center.y);
    boxProxy.position.z += (objectBoxCenter.z - proxyBox3Center.z);

    this.proxyObject = boxProxy;

  }

  clear() {

    //移除对象并释放内存
    this.object3d.parent.remove(this.proxyObject);
    this.proxyObject.geometry.dispose();
    this.proxyObject.material.dispose();
    this.proxyObject.geometry = null;
    this.proxyObject.material = null;
    this.object3d = null;
    this.proxyObject = null;
  }



}

export default TransformProxy;