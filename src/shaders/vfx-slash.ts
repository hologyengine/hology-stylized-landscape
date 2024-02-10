
import { NodeShader, NodeShaderOutput, Parameter } from "@hology/core/shader/shader";
import { BooleanNode, ComponentsVec2Node, ComponentsVec3Node, ConstantMat2Node, FloatNode, IFloatNode, IIntNode, IMat2Node, IMat3Node, IMat4Node, IRgbNode, IRgbaNode, IVec2Node, IVec3Node, IVec4Node, IntNode, Mat2Node, Mat3Node, Mat4Node, SimplexNoiseNode, Vec2Node, Vec3Node, Vec4Node, attributes, cos, float, length, log, pow, rgb, rgba, rotateAxis, sin, standardMaterial, timeUniforms, uniformFloat, varyingAttributes, vec2, vec3, vec4 } from "@hology/core/shader-nodes";
import { Color, Vec2 } from 'three';
import { Compiler } from "three-shader-graph/build/main/lib/compiler";
import { Type } from "@hology/core/dist/utils/type";
import { ease } from "three-nebula";

export default class VfxSlash extends NodeShader {
  @Parameter()
  color: Color = new Color(0xff0000)

  output(): NodeShaderOutput {
    
    const particleEnergy = uniformFloat('hology_particle_energy', 1)

    const uv = varyingAttributes.uv

    const uvDebug = new ComponentsVec3Node(uv.x(), uv.y(), float(1))

    const center = vec2(.5,.5)
    const color = rgb(0x0000ff)

    const dist = distance(uv, center)
    const pointCenter = vec2(0,.5)

    const point = float(1).subtract(distance(uv, pointCenter))

    const edge = color.multiplyScalar(pow(distance(uv, center).add(1), float(2)))

    const alpha = pow(distance(uv, pointCenter), float(2))

    const noise = new SimplexNoiseNode(twirl(uv, float(3)).multiplyScalar(3))


    // It would be good to have a uniform for particles for when it was birthed
    // and then a node for how much time has elapsed since the particle was created. 
    // Basically particleAge. These can be set by the VFX system and possibly updated each 
    // frame. If the particle is a mesh, update uniforms as part of a behaviour.
    // This is useful to control the opacity in the shader

    const alpha2 = pow(distance(uv, vec2(-0.1,.5)), float(8))

    const noise2 = new Voronoi2d(twirl(uv, float(9)).multiplyScalar(5).subtractScalar(timeUniforms.elapsed))

    const alpha3 = alpha2.multiply(pow(noise2 as FloatNode, float(0.2)))

    const pp = passThrough(uv)

    
    // TODO Fix vec3 does not accept a vec2 as first atttribute or 3 float nodes
    return {
      //color: rgba(rgb(0xffffff), particleEnergy)
      
      // This creates some nice effect
      //color: rgba(rgb(0xfcf91c).multiplyScalar(noise), alpha.multiply(noise))


      // 0x0055cc blue
      //0xfcf91c yellow
      color: rgba(rgb(0xfcf91c).add(rgb(0x5555ff).multiplyScalar(.9).multiplyScalar(pow(alpha3, float(2)))), alpha3.multiply(log(particleEnergy).add(1))),
      
      //color: rgba(new ComponentsVec3Node(pp.x(), pp.y(), float(1)), 1)

      //color: rgba(rgb(0xffffff).multiplyScalar(noise2), float(1))
      //transform: rotateAxis(vec3(0,0,1), float(timeUniforms.elapsed.multiply(10)))
    }
  } 

}
// TODO Add distance function

function distance(a: Vec2Node, b: Vec2Node): FloatNode {
  return length(a.subtract(b))
  //pow(b.x().subtract(a.x()), float(2))
}



function twirl(uv: Vec2Node, strength: FloatNode, center: Vec2Node = vec2(0.5, 0.5), offset: Vec2Node = vec2(0.5, 0.5)) {
  const delta = uv.subtract(center)
  const angle = strength.multiply(length(delta))
  const x = cos(angle).multiply(delta.x()).subtract(sin(angle).multiply(delta.y()))
  const y = sin(angle).multiply(delta.x()).add(cos(angle).multiply(delta.y()))
  return new ComponentsVec2Node(x.add(center.x()).add(offset.x()), y.add(center.y()).add(offset.y()))
} 
type AbstractType<T> = abstract new (...args: unknown[]) => T 
type ShaderNode = 
  |FloatNode
  |BooleanNode
  |IntNode
  |Vec2Node
  |Vec3Node
  |Vec4Node
  |Mat2Node
  |Mat3Node
  |Mat4Node

function glslFunction<TReturn extends ShaderNode>(returnType: AbstractType<TReturn>, args: Record<string, ShaderNode >, body: string): TReturn {
  // @ts-expect-error This should be safe
  const returnTypeName = returnType.typeName

  // @ts-expect-error It can expect another type
  return new (class extends returnType {
    public compile(c: Compiler) {
      const functionName = `customFunction_${c.variable()}`
      const argsDef = Object.entries(args).map(([name, value]) => {
        // @ts-expect-error This should be safe
        return `${value.constructor.typeName} ${name}`
      }).join(', ')
      const callArgs = Object.values(args).map((value) => c.get(value)).join(', ')
      return {
        pars: `${returnTypeName} ${functionName}(${argsDef}) {
          ${body}
        }`,
        out: `${functionName}(${callArgs})`
      }
    }
  }) as TReturn
}

function passThrough(uv: Vec2Node) {
  return glslFunction(Vec2Node, {uv}, /*glsl*/`
    float foo = 1.;
    return uv * foo;
  `)
}

// This doesn't work as it has other functions as dependencies
function voronoiNoise2d(uv: Vec2Node) {
  return glslFunction(FloatNode, {uv}, /*glsl*/`
    vec2 p = floor(point);
    vec2 f = fract(point);
    float res = 0.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 b = vec2(i, j);
        vec2 r = vec2(b) - f + rhash(p + b);
        res += 1. / pow(dot(r, r), 8.);
      }
    }
    return pow(1. / res, 0.0625);
  `)
}


class Voronoi2d extends FloatNode {
  constructor(private uv: Vec2Node) {super()}
  compile(c: Compiler) {
    return {
      pars: `
      const mat2 myt = mat2(.12121212, .13131313, -.13131313, .12121212);
const vec2 mys = vec2(1e4, 1e6);

vec2 rhash(vec2 uv) {
uv *= myt;
uv *= mys;
return fract(fract(uv / mys) * uv);
}

vec3 hash(vec3 p) {
return fract(sin(vec3(dot(p, vec3(1.0, 57.0, 113.0)),
dot(p, vec3(57.0, 113.0, 1.0)),
dot(p, vec3(113.0, 1.0, 57.0)))) *
43758.5453);
}

float voronoi2d(const in vec2 point) {
vec2 p = floor(point);
vec2 f = fract(point);
float res = 0.0;
for (int j = -1; j <= 1; j++) {
for (int i = -1; i <= 1; i++) {
vec2 b = vec2(i, j);
vec2 r = vec2(b) - f + rhash(p + b);
res += 1. / pow(dot(r, r), 8.);
}
}
return pow(1. / res, 0.0625);
}
`,
      out: `voronoi2d(${c.get(this.uv)})`
    }
  }

}