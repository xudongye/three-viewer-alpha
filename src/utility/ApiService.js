
const GET_MATERIAL_DATA = '/MOCK/material/';

export default class ApiService {

    static getMaterials() {
        return fetch(GET_MATERIAL_DATA + 'material.json', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then((res) => res.json())
    }

    static getMaterialDataByUrl(materialUrl) {
        return fetch(materialUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then((res) => res.json())
    }


}