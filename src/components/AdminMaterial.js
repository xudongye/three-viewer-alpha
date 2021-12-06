import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { createElement } from "../utility/dom-helper";
import apiService from "../utility/ApiService";
import "../scss/adminMaterial.scss";
import defaultMaterialBallPic from "../images/default-material-ball.png";

class AdminMaterial {
  constructor(viewer) {
    this.container = viewer.el;
    this.materialAll = {}; //放置预设所有材质
    this.initialtMaterial = {}; //放置node初始材质
    this.materialSpherePhoto = [];
    this.viewer = viewer || null;
    this.materialLoader = new THREE.MaterialLoader();
    this.pmremGenerator = null;
    this.materialRender = null;
    this.materialPanel = null;
    this.init();
  }

  init() {
    if (!this.materialRender) {
      this.materialRender = initMaterialRender(this.container);
    }
    if (!this.pmremGenerator) {
      updateMaterialEnvironment.apply(this);
    }
    loadMaterialData.apply(this);
    reloadInitialtMaterial.apply(this);
  }

  enter() {
    let presetMaterials = this.getAllMaterial();
    this.materialPanel = createElement("DIV", "material-panel");

    presetMaterials.map((item, index) => {
      const materialItem = createElement("DIV", "panel-item");
      const imgEl = `<img src='${item.material.image}' />`;
      materialItem.innerHTML = imgEl;
      materialItem.addEventListener("click", () => {
        // alert("设置材质" + item.name)
        if (this.viewer.state.isSelectAll) {
          this.setPartNodeMaterial(item.id);
        } else {
          this.setNodeMaterial(item.id);
        }
      });
      this.materialPanel.appendChild(materialItem);
    });
    this.container.appendChild(this.materialPanel);

    // this.materialRender.canvas.style.display = 'block';
  }

  exit() {
    this.pmremGenerator.dispose();
    this.container.removeChild(this.materialPanel);
    // this.materialRender.canvas.style.display = 'none';
  }

  setMaterialColor(materialId, rgbColor) {
    if (!materialId || !rgbColor) {
      console.warn(' setMaterialColor 缺少materialId  或 rgbColor');
      return
    };
    this.viewer.selectionProxy.hiddenProxy();
    let currentMaterial = this.materialAll[materialId].material;
    currentMaterial.color = new THREE.Color(rgbColor);
  }

  
  setMaterialOpacity(materialId, opacity) {
    if (!materialId || !opacity) {
      console.warn('setMaterialOpacity中 缺少materialId 或 opacity');
      return
    };
    this.viewer.selectionProxy.hiddenProxy();
    if (typeof opacity !== 'number') {
      console.warn('setMaterialOpacity中 opacity或是数据类型非数字');
      return
    };
    this.materialAll[materialId].material.transparent = true;
    if (this.materialAll[materialId]) this.materialAll[materialId].material.opacity = opacity;
  }

  setNodeMaterial(materialId) {
    let target = this.viewer.pickedObject;
    let replaceMaterial = this.initialtMaterial[target.id];
    if (materialId) replaceMaterial = this.materialAll[materialId].material;
    target.material = replaceMaterial;
    this.viewer.selectionProxy.hiddenProxy();
  }

  setPartNodeMaterial(materialId) {
    let target = this.viewer.pickedObject;
    target.traverse((node) => {
      let replaceMaterial = this.initialtMaterial[node.id];
      if (materialId) {
        replaceMaterial = this.materialAll[materialId].material;
      }
      node.material = replaceMaterial;
    });
    this.viewer.selectionProxy.hiddenProxy();
  }

  getAllMaterial() {
    let presetMaterials = [];
    let defaultMaterial = {
      name: "默认",
      material: {
        image: defaultMaterialBallPic,
      },
      isPreset: true,
    };
    presetMaterials.push(defaultMaterial);
    for (let key in this.materialAll) {
      let currentMaterial = this.materialAll[key];

      if (currentMaterial.isPreset) {
        let newMaterialData = materialDataConvert.apply(this, [
          currentMaterial.material,
        ]);
        presetMaterials.push(newMaterialData);
      }
    }
    return presetMaterials;
  }
}

function loadMaterialData() {
  let _this = this;
  apiService.getMaterials().then((res) => {
    res.map((item, index) => {
      apiService.getMaterialDataByUrl(item.materialUrl).then((materialJson) => {
        let materialObject = _this.materialLoader.parse(materialJson);
        loadMaterialJsonTexture(materialJson, materialObject);
        _this.materialAll[materialObject.id] = {
          material: materialObject,
          isPreset: true,
        };
      });
    });
  });
  console.log("材质库初始成功：", this.materialAll);
}

function materialDataConvert(material) {
  let materialData = {
    id: material.id,
    name: material.name,
    material: {
      color: material.color,
      opacity: material.opacity,
      image: getMaterialRenderImage.apply(this, [material.id]),
    },
    isPreset: true,
  };

  return materialData;
}

function getMaterialRenderImage(materialId) {
  if (!materialId) {
    console.warn("getMaterialRenderImage 方法中，缺少必要参数:materialId ");
    return;
  }

  if (this.materialAll[materialId]) {
    this.materialRender.sphere.visible = true;
    this.materialRender.scene.overrideMaterial =
      this.materialAll[materialId].material;
    this.materialRender.renderer.render(
      this.materialRender.scene,
      this.materialRender.camera
    );
    this.materialRender.sphere.visible = false;
    return this.materialRender.canvas.toDataURL("image/png");
  }
}

function reloadInitialtMaterial() {
  for (let key in this.materialAll) {
    if (!this.materialAll[key].isPreset) delete this.materialAll[key];
  }
  for (let key in this.initialtMaterial) {
    if (!this.materialAll[key]) delete this.materialAll[key];
  }
  this.viewer.content.traverse((node) => {
    if (!node.material) return;
    let materialKey = node.material.id;
    if (!this.materialAll[materialKey]) {
      this.materialAll[materialKey] = {
        material: node.material,
      };
    }
    this.initialtMaterial[node.id] = node.material;
  });
  // console.log("原材质初始成功：", this.materialAll, this.initialtMaterial);
}

function loadMaterialJsonTexture(MaterialJson, MaterialObject) {
  let { textures, images } = MaterialJson;

  function findTextures(uuid) {
    let textureArray = textures.filter((item) => {
      return item.uuid === uuid;
    });

    return textureArray[0];
  }

  function findImages(uuid) {
    let imagesArray = images.filter((item) => {
      return item.uuid === uuid;
    });

    return imagesArray[0];
  }

  function addTexture(textureUuid, attributeName) {
    let currentTexture = findTextures(textureUuid);
    let currentImages = findImages(currentTexture.image);
    let imageDataUrl = currentImages.url;

    let texture = new THREE.TextureLoader().load(imageDataUrl);
    MaterialObject[attributeName] = texture;

    //设置属性
    if (currentTexture.name) texture.name = currentTexture.name;
    if (currentTexture.mapping) texture.mapping = currentTexture.mapping;
    if (currentTexture.repeat)
      texture.repeat = new THREE.Vector2(...currentTexture.repeat);
    if (currentTexture.offset)
      texture.offset = new THREE.Vector2(...currentTexture.offset);
    if (currentTexture.center)
      texture.center = new THREE.Vector2(...currentTexture.center);
    if (currentTexture.format) texture.format = currentTexture.format;
    if (currentTexture.type) texture.type = currentTexture.type;
    if (currentTexture.encoding) texture.encoding = currentTexture.encoding;
    if (currentTexture.minFilter) texture.minFilter = currentTexture.minFilter;
    if (currentTexture.magFilter) texture.magFilter = currentTexture.magFilter;
    if (currentTexture.anisotropy)
      texture.anisotropy = currentTexture.anisotropy;
    if (currentTexture.flipY) texture.flipY = currentTexture.flipY;
    if (currentTexture.premultiplyAlpha)
      texture.premultiplyAlpha = currentTexture.premultiplyAlpha;
    if (currentTexture.unpackAlignment)
      texture.unpackAlignment = currentTexture.unpackAlignment;

    if (currentTexture.wrap) {
      //关于wrapS是否对应wrap[0]还是wrap[1], 还未确定
      texture.wrapS = currentTexture.wrap[0];
      texture.wrapT = currentTexture.wrap[1];
    }
  }

  if (MaterialJson.normalMap) addTexture(MaterialJson.normalMap, "normalMap");
  if (MaterialJson.map) addTexture(MaterialJson.map, "map");
}

function updateMaterialEnvironment() {
  if (!this.viewer.envhdrUrl) {
    return;
  }
  this.pmremGenerator = new THREE.PMREMGenerator(this.materialRender.renderer);
  new Promise((resolve, reject) => {
    new RGBELoader().setDataType(THREE.UnsignedByteType).load(
      this.viewer.envhdrUrl,
      (texture) => {
        const envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
        this.pmremGenerator.dispose();
        this.materialRender.scene.environment = envMap;
        resolve();
      },
      undefined,
      reject
    );
  });
}

function initMaterialRender(container) {
  let materialRender = {
    canvas: null,
    scene: new THREE.Scene(),
  };

  materialRender.canvas = createElement("CANVAS", "material-render");
  materialRender.canvas.width = "200";
  materialRender.canvas.height = "200";
  materialRender.canvas.style.display = "none";
  container.appendChild(materialRender.canvas);

  materialRender.camera = new THREE.PerspectiveCamera(
    45,
    materialRender.canvas.width / materialRender.canvas.height,
    1,
    100
  );
  materialRender.camera.position.x = 20;
  materialRender.camera.position.y = 0;
  materialRender.camera.position.z = 0;
  materialRender.camera.lookAt(0, 0, 0);

  materialRender.renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    canvas: materialRender.canvas,
  });

  let light1 = new THREE.DirectionalLight(0x111100, 10);
  light1.position.y += 8;
  light1.position.z += 4;

  let rectLight = new THREE.RectAreaLight(0xffffff, 6, 3, 5);
  rectLight.position.set(0, 5, 8);
  rectLight.lookAt(0, 0, 0);
  materialRender.scene.add(rectLight);

  let rectLight2 = new THREE.RectAreaLight(0xffffff, 4, 3, 5);
  rectLight2.position.set(9, 5, 8);
  rectLight2.lookAt(0, 0, 0);
  materialRender.scene.add(rectLight2);

  let rectLight3 = new THREE.RectAreaLight(0xffffff, 4, 3, 5);
  rectLight3.position.set(-9, 5, 8);
  rectLight3.lookAt(0, 0, 0);
  materialRender.scene.add(rectLight3);

  let rectLight4 = new THREE.RectAreaLight(0xffffff, 4, 5, 3);
  rectLight4.position.set(0, -7, 6);
  rectLight4.lookAt(0, 0, 0);
  materialRender.scene.add(rectLight4);

  let geometry = new THREE.SphereBufferGeometry(5, 32, 32);
  let material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  material.roughness = 0.9;
  material.metalness = 0.1;
  materialRender.sphere = new THREE.Mesh(geometry, material);
  materialRender.sphere.visible = false;
  materialRender.scene.add(materialRender.sphere);

  return materialRender;
}

export default AdminMaterial;
