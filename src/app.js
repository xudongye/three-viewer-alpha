import { WEBGL } from 'three/examples/jsm/WebGL.js';
import { SimpleDropzone } from 'simple-dropzone';
import queryString from 'query-string';
import { Viewer } from './components/Viewer';

if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
    console.error('The File APIs are not fully supported in this browser.');
} else if (!WEBGL.isWebGLAvailable()) {
    console.error('WebGL is not supported in this browser.');
}

class App {
    /**
     * @param  {Element} el
     * @param  {Location} location
     */
    constructor(el, location) {
        const hash = location.hash ? queryString.parse(location.hash) : {};
        this.options = {
            kiosk: Boolean(hash.kiosk),
            model: hash.model || '',
            preset: hash.preset || '',
            cameraPosition: hash.cameraPosition
                ? hash.cameraPosition.split(',').map(Number)
                : null,
            urls: [
                '/data/cross_d.glb',
                '/data/che1_d.glb',
                '/data/che2_d.glb',
                '/data/che3_d.glb',
                '/data/che4_d.glb',
                '/data/che5_d.glb',
                '/data/che6_d.glb',
                '/data/che7_d.glb',
                '/data/che8_d.glb',
            ]
        };

        this.el = el;
        this.viewer = null;
        this.viewerEl = null;
        this.spinnerEl = el.querySelector('.spinner');
        this.dropEl = el.querySelector('.dropzone');
        this.inputEl = el.querySelector('#file-input');

        this.createDropzone();
        this.hideSpinner();

        // this.createViewer();

        const options = this.options;
        if (options.urls) {
            this.showSpinner()
            this.loadUrls(options.urls);
        }
    }

    createDropzone() {
        const dropCtrl = new SimpleDropzone(this.dropEl, this.inputEl);
        dropCtrl.on('drop', ({ files }) => this.load(files));
        dropCtrl.on('dropstart', () => this.showSpinner());
        dropCtrl.on('droperror', () => this.hideSpinner());
    }


    /**
     * Sets up the view manager.
     * @return {Viewer}
     */
    createViewer() {
        this.viewerEl = document.createElement('div');
        this.viewerEl.classList.add('viewer');
        this.dropEl.innerHTML = '';
        this.dropEl.appendChild(this.viewerEl);
        this.viewer = new Viewer(this.viewerEl, this.options);
        return this.viewer;
    }

    /**
   * Loads a fileset provided by user action.
   * @param  {Map<string, File>} fileMap
   */
    load(fileMap) {
        let rootFile, rootPath;
        Array.from(fileMap).forEach(([path, file], index) => {
            if (file.name.match(/\.(gltf|glb)$/)) {
                rootFile = file;
                rootPath = path.replace(file.name, '');
            }
            if (!rootFile) {
                this.onError('No .gltf or .glb asset found.');
            }
            this.view(rootFile, rootPath, fileMap, fileMap.size);
        });
    }

    loadUrls(urls) {
        for (let index = 0; index < urls.length; index++) {
            this.view(urls[index], '', new Map(), urls.length);
        }
    }



    /**
   * Passes a model to the viewer, given file and resources.
   * @param  {File|string} rootFile
   * @param  {string} rootPath
   * @param  {Map<string, File>} fileMap
   */
    view(rootFile, rootPath, fileMap, modelNum) {
        const viewer = this.viewer || this.createViewer();
        const fileURL = typeof rootFile === 'string'
            ? rootFile
            : URL.createObjectURL(rootFile);
        const cleanup = () => {
            if (typeof rootFile === 'object') URL.revokeObjectURL(fileURL);
        };

        viewer
            .load(fileURL, rootPath, fileMap)
            .catch((e) => this.onError(e))
            .then((obj) => {
                if (!this.options.kiosk) {
                    let content = viewer.setContent(obj.scene, obj.clips);
                    if (content.children.length == modelNum) {
                        this.hideSpinner();
                        viewer.gltfLoadCompleted();
                    }
                }
                cleanup();
            });

    }


    /**
     * @param  {Error} error
     */
    onError(error) {
        let message = (error || {}).message || error.toString();
        if (message.match(/ProgressEvent/)) {
            message = 'Unable to retrieve this file. Check JS console and browser network tab.';
        } else if (message.match(/Unexpected token/)) {
            message = `Unable to parse file content. Verify that this file is valid. Error: "${message}"`;
        } else if (error && error.target && error.target instanceof Image) {
            message = 'Missing texture: ' + error.target.src.split('/').pop();
        }
        window.alert(message);
        console.error(error);
    }

    showSpinner() {
        this.spinnerEl.style.display = '';
    }

    hideSpinner() {
        this.spinnerEl.style.display = 'none';
    }
}


document.addEventListener('DOMContentLoaded', () => {

    const app = new App(document.body, location);

});