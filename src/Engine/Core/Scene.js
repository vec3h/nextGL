import {Light} from './Lights/Light';
import {AmbientLight} from './Lights/AmbientLight';
import {DirectLight} from './Lights/DirectLight';
import {PointLight} from './Lights/PointLight';

import twgl from 'twgl-base.js';

class Scene {
	constructor(gl) {
		this._gl = gl;
		this.renderablesByProgram = new Map();
		this.sceneObjects = new Map();
		this.lights = [];

		this.UBOData = new Map();
	}

	addToScene(sceneObject) {
		this.sceneObjects.set(sceneObject.id, sceneObject);

		if (sceneObject instanceof Light) {
			this.lights.push(sceneObject);
			this._updateLightsUBO();
		}

		if (!sceneObject.material) return; // empty object

		sceneObject.initObject(this._gl);

		if (!this.UBOData.has(sceneObject.material)) {
			this._createUBO(sceneObject.material);
			this._updateLightsUBO();
		}

		if (this.renderablesByProgram.has(sceneObject.material.programInfo.program)) {
			const renderable = this.renderablesByProgram.get(sceneObject.material.programInfo.program);
			renderable.sceneObjects.push(sceneObject);
		} else {
			this.renderablesByProgram.set(sceneObject.material.programInfo.program, {sceneObjects: [sceneObject]});
		}
	}

	removeFromScene(sceneObject) {
		const object = this.getObjectById(sceneObject.id);

		if (!object) {
			console.warn('Can`t find object in this scene');
			return;
		}

		if (object.material) {
			const renderable = this.renderablesByProgram.get(sceneObject.material.program);
			const index = renderable.sceneObjects.indexOf(sceneObject);
			renderable.sceneObjects.splice(index, 1);
		}

		if (object.children) {
			for (const child of object.children) {
				this.removeFromScene(child);
			}
		}

		this.sceneObjects.delete(sceneObject.id);
	}

	getObjectById(id) {
		return this.sceneObjects.get(id);
	}

	_updateLightsUBO() {
		for (const light of this.lights) {

			if (light instanceof AmbientLight) {
				this._updateAmbientLightUBO(light);
			}

			if (light instanceof DirectLight) {
				this._updateDirectLightUBO(light);
			}

			if (light instanceof PointLight) {
				this._updatePointLightUBO(light);
			}
		}
	}

	_createUBO(material) {
		this.UBOData.set(material, {
			lightUBO: twgl.createUniformBlockInfo(this._gl.glContext, material.programInfo, 'Lights'),
			vertexPointLightUBO: twgl.createUniformBlockInfo(this._gl.glContext, material.programInfo, 'PointLight'),
			projectionMatrixUBO: twgl.createUniformBlockInfo(this._gl.glContext, material.programInfo, 'Projection'),
			viewPosition: twgl.createUniformBlockInfo(this._gl.glContext, material.programInfo, 'View'),
		});
	}

	updateProjectionMatrixUBO(projectionMatrix) {
		for (const [material, ubos] of this.UBOData.entries()) {
			twgl.setBlockUniforms(ubos.projectionMatrixUBO, {
				uProjectionMatrix: projectionMatrix
			});

			this.updateUBO(material.programInfo, ubos.projectionMatrixUBO);
		}
	}

	_updateDirectLightUBO(light) {
		for (const [material, ubos] of this.UBOData.entries()) {
			twgl.setBlockUniforms(ubos.lightUBO, {
				'directLight.u_direction': light.direction,
				'directLight.u_color': [light.color.r, light.color.g, light.color.b],
				'directLight.u_intencity': light.intencity
			});

			this.updateUBO(material.programInfo, ubos.lightUBO);
		}
	}

	_updateAmbientLightUBO(light) {
		for (const [material, ubos] of this.UBOData.entries()) {
			twgl.setBlockUniforms(ubos.lightUBO, {
				'ambientLight.u_color': [light.color.r, light.color.g, light.color.b],
				'ambientLight.u_intencity': light.intencity
			});

			this.updateUBO(material.programInfo, ubos.lightUBO);
		}
	}

	_updatePointLightUBO(light) {
		for (const [material, ubos] of this.UBOData.entries()) {
			twgl.setBlockUniforms(ubos.lightUBO, {
				'pointLight.u_color': [light.color.r, light.color.g, light.color.b],
				'pointLight.u_power': light.power,
				'pointLight.u_specular_color': [light.specularColor.r, light.color.g, light.color.b],
				'pointLight.u_intencity': light.intencity
			});

			twgl.setBlockUniforms(ubos.vertexPointLightUBO, {
				uPointLightPosition: light.lightPosition
			});



			this.updateUBO(material.programInfo, ubos.vertexPointLightUBO);
			this.updateUBO(material.programInfo, ubos.lightUBO);

		}
	}

	updateCameraPositionUBO(position) {
		for (const [material, ubos] of this.UBOData.entries()) {

			twgl.setBlockUniforms(ubos.viewPosition, {
				uViewWorldPosition: position
			});

			this.updateUBO(material.programInfo, ubos.viewPosition);
		}
	}

	updateUBO(programInfo, ubo) {
		twgl.setUniformBlock(this._gl.glContext, programInfo, ubo);
		twgl.bindUniformBlock(this._gl.glContext, programInfo, ubo);
	}

}
export {Scene};

