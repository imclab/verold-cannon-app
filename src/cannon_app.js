/*
Copyright (c) 2013 Verold Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/* global ModelObject */
define([ 'underscore', 'compound_mesh', 'cannon' ],
      function(_, CompoundMesh, CANNON) {
  if (typeof window.VAPI === 'undefined' || typeof window.VAPI.VeroldApp === 'undefined') {
    throw new Error('VAPI.VeroldApp does not exist!');
  }

  var CannonApp = window.VAPI.CannonApp = window.VAPI.VeroldApp.extend({
    constructor: function() {
      window.VAPI.VeroldApp.prototype.constructor.apply(this, arguments);

      this.bodies = [];
    },

    engineReady: function() {
      var that = this;

      this.loadScene(this.defaultSceneID, {
        success_hierarchy: function(scene) {
          that.defaultScene = scene;

          that.trigger('cannon:pre_init', scene);
          that.initializeCannon(scene);
          that.trigger('cannon:post_init', scene);
          that.defaultSceneLoaded(scene);

          that.veroldEngine.on('update', that.update, that);
          that.veroldEngine.on('fixedUpdate', that.fixedUpdate, that);
        },

        progress: function(sceneObj) {
          that.defaultSceneProgress(sceneObj);
        }
      });
    },

    initializeCannon: function(scene) {
      var that = this,
          groundBody,
          groundShape,
          gravityX = 0,
          gravityY = -9.82,
          gravityZ = 0;

      if (scene.entityModel.has('payload.userData.gravityX')) {
        gravityX = scene.entityModel.get('payload.userData.gravityX');
      }

      if (scene.entityModel.has('payload.userData.gravityY')) {
        gravityY = scene.entityModel.get('payload.userData.gravityY');
      }

      if (scene.entityModel.has('payload.userData.gravityZ')) {
        gravityZ = scene.entityModel.get('payload.userData.gravityZ');
      }

      this.world = new CANNON.World();
      this.world.gravity.set(gravityX, gravityY, gravityZ);
      this.world.broadphase = new CANNON.NaiveBroadphase();

      // TODO: make this stuff configurable
      this.world.solver.iterations = 7;
      this.world.solver.tolerance = 0.1;
      this.world.defaultContactMaterial.contactEquationStiffness = 1e9;
      this.world.defaultContactMaterial.contactEquationRegularizationTime = 4;

      groundShape = new CANNON.Plane();
      groundBody = new CANNON.RigidBody(0, groundShape);
      groundBody.position.set(0, 0, 0);

      // Rotate plane, Verold Studio is Y up
      groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), 0.5 * Math.PI);

      this.world.add(groundBody);

      this.defaultScene.traverse(function(obj) {
        if (obj instanceof ModelObject) {
          that.addBody(obj);
        }
      });
    },

    fixedUpdate: function(delta) {
      this.world.step(delta);

      _.each(this.bodies, function(body) {
        body.update(delta);
      }, this);
    },

    update: function(/*delta*/) {

    },

    addBody: function(obj) {
      this.bodies.push(new CompoundMesh(this.world, obj));
    }
  });

  return CannonApp;
});
