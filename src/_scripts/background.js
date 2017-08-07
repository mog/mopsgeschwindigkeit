(function () {
	"use strict";

	// 6 scenes
	// brandenburger tor
	// brücke

	const
		glMatrix = require('gl-matrix'),
		Vector3 = glMatrix.vec3,
		Matrix4 = glMatrix.mat4,
		Quaternion = glMatrix.quat,
		SeedRandom = require('seedrandom'),
		PseudoRandom = new SeedRandom('Deadline 2017')
	;

	// Initialize context
	const gl = (function () {
		var gl = document.querySelector('canvas[data-provide="background"]').getContext('webgl',{antialias:true,depth:true});
		window.addEventListener('resize', (function resize () {
			gl.viewport(
				0,0,
				gl.canvas.width=Math.min(window.innerWidth,gl.canvas.clientWidth),
				gl.canvas.height=Math.min(window.innerHeight,gl.canvas.clientHeight)
			);
			return resize;
		})());
		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.depthFunc(gl.GREATER);
		gl.clearDepth(0);
		gl.clearColor(0,0,0,0);
		return gl;
	})();

	// Solid library
	const Solids = (function() {
		var
			vbuff = gl.createBuffer(),
			ibuff = gl.createBuffer(),
			vdata = [],
			idata = []
		;
		// box
		vdata.push(
			// front
			-1,1,1, 0,0,1,
			-1,-1,1, 0,0,1,
			1,-1,1, 0,0,1,
			1,1,1, 0,0,1,
			// back
			-1,1,-1, 0,0,-1,
			-1,-1,-1, 0,0,-1,
			1,-1,-1, 0,0,-1,
			1,1,-1, 0,0,-1,
			// left
			-1,1,-1, -1,0,0,
			-1,-1,-1, -1,0,0,
			-1,-1,1, -1,0,0,
			-1,1,1, -1,0,0,
			// right
			1,1,-1, 1,0,0,
			1,-1,-1, 1,0,0,
			1,-1,1, 1,0,0,
			1,1,1, 1,0,0,
			// top
			-1,1,-1, 0,1,0,
			-1,1,1, 0,1,0,
			1,1,1, 0,1,0,
			1,1,-1, 0,1,0,
			// bottom
			-1,-1,-1, 0,-1,0,
			-1,-1,1, 0,-1,0,
			1,-1,1, 0,-1,0,
			1,-1,-1, 0,-1,0
		);
		idata.push(
			0,1,2,2,3,0,
			6,5,4,4,7,6,
			8,9,10,10,11,8,
			14,13,12,12,15,14,
			16,17,18,18,19,16,
			22,21,20,20,23,22
		);
		// // octagon
		// var a, tmp, ca, sa;
		// for (a = 0; a < 8; a++) {
		// 	tmp = a / 8 * 2 * Math.PI;
		// 	sa = Math.sin(tmp);
		// 	ca = Math.cos(tmp);
		// 	vdata.push(
		// 		sa, 1,ca, sa,0,ca,
		// 		sa,-1,ca, sa,0,ca
		// 	);
		// }
		// tmp = idata.length + 14;
		// for (i = idata.length; i < tmp; i += 2)
		// 	idata.push(i,i+1,i+2,i+3,i+2,i+1);
		// idata.push(i+1,tmp,i,i+1,tmp+1,tmp);


		gl.bindBuffer(gl.ARRAY_BUFFER, vbuff);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vdata), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuff);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(idata), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);

		return {
			Box: {
				IndexMode: gl.TRIANGLES,
				Offset: 0,
				Elements: 36
			},
			// Octagon: {
			// 	IndexMode: gl.TRIANGLES,
			// 	Offset: 36,
			// 	Elements: 8
			// },
			draw: function (type) {
				gl.drawElements(
					type.IndexMode,
					type.Elements,
					gl.UNSIGNED_BYTE,
					type.Offset
				);
				return this;
			}
		}
	})();

	// Camera object
	const Camera = ({
		position: Vector3.fromValues(0,0,10),
		lookAt: Vector3.create(),
		up: Vector3.fromValues(0,1,0),
		projection: Matrix4.create(),
		view: Matrix4.create(),
		viewProjection: Matrix4.create(),
		near: 10000,
		far: -10000,
		zoom: 1,
		update: function () {
			var w2 = (gl.canvas.clientWidth/2)*this.zoom;
			Matrix4.ortho(
				this.projection,
				-w2, w2,
				0, gl.canvas.clientHeight*this.zoom,
				this.near, this.far
			);
			Matrix4.lookAt(
				this.view,
				this.position,
				this.lookAt,
				this.up
			);
			Matrix4.multiply(
				this.viewProjection,
				this.projection,
				this.view
			);
			return this;
		}
	}).update();
	window.addEventListener('resize', Camera.update.bind(Camera));

	//DEBUG: Camera controls
	window.addEventListener('mousemove',(e) => {
		var
			x = (e.clientX/window.innerWidth)*2-1,
			y = (e.clientY/window.innerHeight)*2-1
		;
		if (Math.abs(x)<.2&&Math.abs(y)<.2) {
			Camera.position[0] = 0;
			Camera.position[1] = 0;
		} else {
			Camera.position[0] = x*10;
			Camera.position[1] = y*10;
		}
		Camera.update();
	});
	window.addEventListener('wheel', (e) => {
		Camera.zoom = Math.min(Math.max(Camera.zoom+e.deltaY*.01,.1),5);
		Camera.update();
	}, {passive:true});

	// Directional light source
	const Light = {
		direction: Vector3.normalize(Vector3.create(),[-1,2,0]),
		color: new Float32Array([1,1,1,1])
	}

	// Rendering shader
	const Shader = (function () {
		var
			program = gl.createProgram(),
			vshader = gl.createShader(gl.VERTEX_SHADER),
			fshader = gl.createShader(gl.FRAGMENT_SHADER)
		;
		// Vertex shader
		gl.shaderSource(vshader, `
			uniform mat4 mViewProjection;
			uniform mat4 mTransform;
			uniform mat4 mWorld;

			attribute vec3 position;
			attribute vec3 normal;
			varying vec3 vNormal;

			void main () {
				vec4 worldPosition = (mTransform * mWorld) * vec4(position, 1);
				vNormal = normalize(mat3(mWorld)*normal);
				gl_Position = mViewProjection * worldPosition;
			}
		`);
		gl.compileShader(vshader);
		// Fragment shader
		gl.shaderSource(fshader, `
			precision mediump float;

			uniform float fTimeOfDay;
			uniform vec3 vLightDirection;
			uniform vec4 vLightColor;
			uniform float fPaletteIndex;
			uniform sampler2D uPalette;
			
			varying vec3 vNormal;

			void main () {
				gl_FragColor = vec4(texture2D(uPalette, vec2(max(dot(vNormal,vLightDirection),0.),fPaletteIndex)).rgb*vLightColor.rgb*vLightColor.a,1);
			}
		`);
		gl.compileShader(fshader);

		// Program
		gl.attachShader(program, vshader);
		gl.attachShader(program, fshader);
		gl.linkProgram(program);
		gl.useProgram(program);

		// Palette
		const palette = (function () {
			var
				palette = require('../sharedConfig.json').palette,
				colorNames = Object.keys(palette),
				colorData = new Uint8Array(Array.prototype.concat.apply([],Array.prototype.concat.apply([],colorNames.map(n=>palette[n])).reverse().map(c=>[c.substr(1,2),c.substr(3,2),c.substr(5,2)].map(h=>parseInt(h,16))))),
				paletteTexture = gl.createTexture(gl.TEXTURE_2D),
				ret
			;
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
			gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 3, colorNames.length, 0, gl.RGB, gl.UNSIGNED_BYTE, colorData);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			ret = colorNames.slice().reverse();
			ret.forEach((name,index)=>ret[name]=index);
			return ret;
		})();

					
		const
			paletteLocation = gl.getUniformLocation(program, "uPalette"),
			todLocation = gl.getUniformLocation(program, "fTimeOfDay"),
			paletteIndexLocation = gl.getUniformLocation(program, "fPaletteIndex"),
			lightDirectionLocation = gl.getUniformLocation(program, "vLightDirection"),
			lightColorLocation = gl.getUniformLocation(program, "vLightColor"),
			viewProjectionLocation = gl.getUniformLocation(program, "mViewProjection"),
			transformLocation = gl.getUniformLocation(program, "mTransform"),
			worldLocation = gl.getUniformLocation(program, "mWorld"),
			identity = Matrix4.create(),
			transformIdentity = true
		;
		return {
			palette: palette,
			timeOfDay: 1,
			setGlobalUniforms: function () {
				gl.uniform3fv(lightDirectionLocation, Light.direction);
				gl.uniform4fv(lightColorLocation, Light.color);
				gl.uniformMatrix4fv(viewProjectionLocation, false, Camera.viewProjection);
				gl.uniform1f(todLocation, this.timeOfDay);
				return this;
			},
			setTransform: function (transform) {
				if (transform)
					return gl.uniformMatrix4fv(transformLocation, false, transform);
				if (!transformIdentity)
					return gl.uniformMatrix4fv(transformLocation, false, identity);
			},
			setObjectUniforms: function (worldMatrix, paletteIndex) {
				gl.uniformMatrix4fv(worldLocation, false, worldMatrix);
				gl.uniform1f(paletteIndexLocation, paletteIndex/this.palette.length + (.5/this.palette.length));
			}
		}
	})();


	var
		solids = [],
		updates = []
	;

	class SolidInstance {
		constructor (type, position, rotation, scale, paletteIndex) {
			this.type = type || Solids.Box;
			this.position = Vector3.clone(position||[0,0,0]);
			this.rotation = Quaternion.clone(rotation||[0,0,0,1]);
			this.scale = Vector3.clone(Array.isArray(scale)?scale:(!isNaN(scale)?[scale,scale,scale]:[1,1,1]));
			this.paletteIndex = paletteIndex||0;
			this.matrix = Matrix4.create();
			this.children = null;
			this.update();
		}
		update () {
			Matrix4.fromRotationTranslationScale(this.matrix, this.rotation,this.position,this.scale);
		}
	}

	class SolidAggregate extends SolidInstance {
		constructor (solids, position, rotation, scale) {
			super(null, position, rotation, scale);
			delete this.type;
			this.children = solids ? solids.slice() : [];
		}
	}

	// class Scene {
	// 	constructor (element, cameraPosition, cameraLookAt, cameraZoom) {
	// 		this.element = element;
	// 		this.objects = [];
	// 		this.updates = [];
	// 		this.camposition = new Float32Array(cameraPosition||[-1,1,1]);
	// 		this.camlookat = new Float32Arra(cameraLookAt||[0,0,0]);
	// 		this.camzoom = cameraZoom||1;
	// 		this.threshold = 50;
	// 	}
	// }



	var IntroScene = new SolidAggregate(null, [450,0,0]);
	(function () {
		var Tower = (function () {
			var
				tower = [],
				scale,
				offsetx,
				offsetz,
				i
			;
			for (i = 0; i < 60; i++) {
				scale = (Math.random()*5+(40-(i>30&&i<40?-15*(5-Math.abs(i-35)):i*.8))+10)*.7;
				tower.push(
					new SolidInstance(
						Solids.Box,
						i != 0 ?
							[0,tower[i-1].position[1]+tower[i-1].scale[1]*.5+15,0]:
							[0,10,0]
						,
						Quaternion.normalize([],[0,Math.random()*3.14,0,1]),
						[scale,10,scale],
						[
							Shader.palette.lavender_pink,
							Shader.palette.charlotte
						][(Math.random()*1.99)|0]
					)
				);
			}
			return tower;
		})();

		var BrandenburgGate = (function () {
			var gate = [], x, y, z;
			for (x = -300; x < 300; x += 100) {
				// Infill
				gate.push(new SolidInstance(
					Solids.Box,
					[x+(x<0?-25:25)+50,120,0],
					null,
					[25,120,50],
					Shader.palette.gray
				));
				// Pillars
				for (z = 100; z >= -100; z-=200) {
					for (y = 0; y < 120; y+=10) {
						gate.push(new SolidInstance(
							Solids.Box,
							[x+(x<0?-25:25)+50,10+y*2,z],
							Quaternion.normalize([],[0,Math.random()*1.78,0,1]),
							[15,10,15],
							Shader.palette.gray
						));
					}
				}
			}
			// Roofing 1
			gate.push(new SolidInstance(
				Solids.Box,
				[0,245,0],
				null,
				[300,20,120],
				Shader.palette.gray
			));
			// Roofing 1.5
			gate.push(new SolidInstance(
				Solids.Box,
				[0,245+20,0],
				null,
				[310,5,130],
				Shader.palette.gray
			));
			// Roofing 2
			gate.push(new SolidInstance(
				Solids.Box,
				[0,245+40,0],
				null,
				[280,25,60],
				Shader.palette.gray
			));
			// Roofing 2.5
			for(y = 5; y < 20; y+=5) {
				gate.push(new SolidInstance(
					Solids.Box,
					[0,245+20+y*2,0],
					null,
					[240-y*2,5,100-y*2],
					Shader.palette.gray
				));
			}
			// Roofing 3
			gate.push(new SolidInstance(
				Solids.Box,
				[0,245+40,0],
				null,
				[80,20,100],
				Shader.palette.gray
			));
			// quadriga
			// horses
			for (x = -80; x < 80; x+=40) {
				gate.push(
					new SolidInstance(Solids.Box,[x+20,320,60],null,[10,20,30],Shader.palette.charlotte)
				);
			}
			// trolley
			gate.push(new SolidInstance(Solids.Box,[0,320,-20],null,[25,25,40],Shader.palette.charlotte));
			// rider
			gate.push(new SolidInstance(Solids.Box,[0,350,-30],null,[10,50,10],Shader.palette.charlotte));

			return gate;
		})();

		var VictoryColumn = (function () {
			var vc = [], i, r;
			// socket
			vc.push(
				new SolidInstance(Solids.Box,[0,40,0],null,[100,30,100],Shader.palette.gray),
				new SolidInstance(Solids.Box,[0,40,0],null,[120,30,60],Shader.palette.gray),
				new SolidInstance(Solids.Box,[0,40,0],null,[60,30,120],Shader.palette.gray),
				new SolidInstance(Solids.Box,[0,5,0],null,[130,5,130],Shader.palette.gray),
				new SolidInstance(Solids.Box,[0,75,0],null,[55,5,55],Shader.palette.gray)
			);
			for (i = 0; i < 360; i += 45) {
				r = glMatrix.glMatrix.toRadian(i);
				vc.push(new SolidInstance(
					Solids.Box,
					[Math.sin(r)*50,105,Math.cos(r)*50],
					null,
					[5,30,5],
					Shader.palette.gray
				));
			}
			vc.push(new SolidInstance(Solids.Box,[0,135,0],null,[55,5,55],Shader.palette.gray));
			for (i = 145; i < 540; i+=20) {
				r=30-i*.025
				vc.push(new SolidInstance(
					Solids.Box,
					[0,i,0],
					Quaternion.normalize([],[0,Math.random()*1.57,0,1]),
					[r,10,r],
					Shader.palette.gray
				));
			}
			vc.push(new SolidInstance(
				Solids.Box,
				[0,560,0],
				null,
				[10,60,10],
				Shader.palette.astra
			));
			return vc;
		})();

		var Reichstag = (function () {
			var reichstag = [],x,y,z;
			// socket
			reichstag.push(
				new SolidInstance(
					Solids.Box,
					[0,40,0],
					null,
					[980,40,680],
					Shader.palette.gray
				),
				new SolidInstance(
					Solids.Box,
					[830,40,0],
					null,
					[120,40,700],
					Shader.palette.gray
				),
				new SolidInstance(
					Solids.Box,
					[-830,40,0],
					null,
					[120,40,700],
					Shader.palette.gray
				),
				new SolidInstance(
					Solids.Box,
					[0,40,530],
					null,
					[1000,40,120],
					Shader.palette.gray
				),
				new SolidInstance(
					Solids.Box,
					[0,40,-530],
					null,
					[1000,40,120],
					Shader.palette.gray
				),
				// front area
				new SolidInstance(
					Solids.Box,
					[0,40,200],
					null,
					[275,40,650],
					Shader.palette.gray
				),
				// driveways
				new SolidInstance(
					Solids.Box,
					[-650,30,1000],
					Quaternion.normalize([],[0,0,.05,1]),
					[400,10,100],
					Shader.palette.gray
				),
				new SolidInstance(
					Solids.Box,
					[650,30,1000],
					Quaternion.normalize([],[0,0,-.05,1]),
					[400,10,100],
					Shader.palette.gray
				),
				// building blocks
				new SolidInstance(
					Solids.Box,
					[0,240,0],
					null,
					[275,160,650],
					Shader.palette.gray
				),
				new SolidInstance(
					Solids.Box,
					[-830,240,0],
					null,
					[120,160,650],
					Shader.palette.gray
				),
				new SolidInstance(
					Solids.Box,
					[830,240,0],
					null,
					[120,160,650],
					Shader.palette.gray
				),
				new SolidInstance(
					Solids.Box,
					[0,240,480],
					null,
					[900,160,150],
					Shader.palette.gray
				),
				new SolidInstance(
					Solids.Box,
					[0,240,-480],
					null,
					[900,160,150],
					Shader.palette.gray
				),
				new SolidInstance(
					Solids.Box,
					[0,240,0],
					null,
					[50,50,50]
				)	
			);
			// front roofing
			reichstag.push(
				new SolidInstance(
					Solids.Box,
					[-130,450,700],
					Quaternion.normalize([],[0,0,.2,1]),
					[150,10,80],
					Shader.palette.gray
				),
				new SolidInstance(
					Solids.Box,
					[130,450,700],
					Quaternion.normalize([],[0,0,-.2,1]),
					[150,10,80],
					Shader.palette.gray
				)
			);
			// front roofing pillars
			for (x = -250; x <= 300; x += 100) {
				for (y = 0; y < 160; y+=10) {
					reichstag.push(new SolidInstance(
						Solids.Box,
						[x,80+10+y*2,750],
						Quaternion.normalize([],[0,Math.random()*1.78,0,1]),
						[15,10,15],
						Shader.palette.gray
					));
				}
			}

			return reichstag;
		})();

		// solids.push(new SolidInstance(
		// 	Solids.Box,
		// 	[0,-2.5,0],
		// 	null,
		// 	[10000,2.5,10000],
		// 	Shader.palette.gray
		// ));

		var Skyline = (function () {
			var
				skyline = [],
				numbuildings = 100,
				offsetsize = numbuildings*15,
				offsetx, offsetz,
				scale, height, i
			;
			for (i = 0; i < numbuildings; i++) {
				scale = PseudoRandom()*50+30;
				offsetx = (PseudoRandom()*offsetsize+100)*(PseudoRandom()>.5?-1:1);
				offsetz = (PseudoRandom()*offsetsize+100)*(PseudoRandom()>.5?-1:1);
				height = Math.abs(50+PseudoRandom()*300*(1-Math.sqrt(Math.pow(offsetx/(offsetsize+100),2)+Math.pow(offsetz/(offsetsize+100),2))));
				skyline.push(
					new SolidInstance(
						Solids.Box,
						[
							offsetx,
							height,
							offsetz
						],
						null,
						[scale,height,scale],
						Shader.palette.gray
					)
				);
			}
			return skyline;
		})();


		Array.prototype.push.apply(IntroScene.children, Tower);
		Array.prototype.push.apply(IntroScene.children, Skyline);

		// floor
		// (function () {
		// 	var floor=[], i, x, z;
		// 	for (x = -1024; x<1024; x+=32) {
		// 		for (z = -1024; z<1024; z+=32) {
		// 			floor.push(new SolidInstance(
		// 				Solids.Box,
		// 				[x,-700-(Math.abs(x)<100||Math.abs(z)<100?15:0),z],
		// 				null,
		// 				15,
		// 				Shader.palette.gray
		// 			));
		// 		}
		// 	}
		// 	Array.prototype.push.apply(solids, floor);
		// 	updates.push(function (t,d) {
		// 		var tmp, i;
		// 		t*=.01;
		// 		for (i = 0; i < floor.length; i++) {
		// 			// tmp = floor[i];
		// 			// tmp.position[1] = -700 + (Math.sin(tmp.position[0]*.01+t)+Math.cos(tmp.position[2]*.01+t))*10
		// 			// tmp.update();
		// 		}
		// 	});
		// })();

		// Street cross
		// solids.push(
		// 	new SolidInstance(Solids.Box, [0,-700,20],null,[2000,1,100],Shader.palette.gray),
		// 	new SolidInstance(Solids.Box, [0,-700,0],null,[100,1,2000],Shader.palette.gray)
		// );

		// Cars
		// (function () {
		// 	var cars = [], i;
		// 	for (i = 0; i < 50; i++) {
		// 		if (i%2)
		// 			cars.push(new SolidInstance(Solids.Box, [0,-690,Math.random()*100-50], null, 10, (Math.random()*Shader.palette.length)|0));
		// 		else
		// 			cars.push(new SolidInstance(Solids.Box, [Math.random()*100-50,-690,0], null, 10, (Math.random()*Shader.palette.length)|0));
		// 	}
		// 	Array.prototype.push.apply(solids, cars);
		// 	updates.push(function (t,d) {
		// 		var tmp, i;
		// 		for (i = 0; i < cars.length; i++) {
		// 			tmp = cars[i];
		// 			if (i%2)
		// 				tmp.position[0] = (t*(.1+(i*.87654)%.3))%4000-2000;
		// 			else
		// 				tmp.position[2] = (t*(.1+(i*.76543)%.3))%4000-2000;
		// 			tmp.update();
		// 		}
		// 	});
		// })();

		// flying cubes
		// (function () {
		// 	var cubes = [], i;
		// 	for (i = 0; i < 20; i++)
		// 		cubes.push(new SolidInstance(Solids.Box,[0,500,0],null,[10,10,10],Shader.palette.sail));
		// 	Array.prototype.push.apply(solids, cubes);

		// 	updates.push(function (t) {
		// 		var s=t*.001, tmp, i;
		// 		for (i=0;i<cubes.length;i++) {
		// 			tmp = cubes[i];
		// 			tmp.position[0]=Math.sin(s+i)*500;
		// 			tmp.position[1]=Math.sin(s*5.627+i*461.631876)*20;
		// 			tmp.position[2]=Math.cos(s+i)*500;
		// 			// tmp.position[2]=Math.sin(s-i*5)*500;
		// 			Quaternion.normalize(tmp.rotation,tmp.rotation);
		// 			tmp.update();
		// 		}
		// 	});
		// })();
	})();


	function renderHierarchy (elements, transform) {
		var tmpElement, i;
		Shader.setTransform(transform);
		for (i = 0; i < elements.length; i++) {
			tmpElement = elements[i];
			if (tmpElement.type) {
				Shader.setObjectUniforms(tmpElement.matrix, tmpElement.paletteIndex);
				Solids.draw(tmpElement.type);
			}
			if (tmpElement.children && tmpElement.children.length) {
				Matrix4.multiply(transform, transform, tmpElement.matrix);
				renderHierarchy(tmpElement.children, transform);
			}
		}
	}

	var
		tmpTransform = Matrix4.create(),
		prevTime = 0
	;
	solids = [IntroScene];
	Camera.zoom = 1.8;
	(function draw(p) {
		var
			delta = p-prevTime,
			isIdentity=true,
			tmp, i
		;

		gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
		requestAnimationFrame(draw);

		Shader.timeOfDay = Math.sin(p*.0004)*.5+.5
		Shader.setGlobalUniforms();

		for (i = 0; i < updates.length; i++)
			updates[i](p,delta);

		renderHierarchy(solids, Matrix4.identity(tmpTransform));

		prevTime = p;
		return draw;
	})(performance.now())
})();