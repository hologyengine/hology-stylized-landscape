
import { NodeShaderMaterial, SimplexNoiseNode, UniformVec3Node, attributes, clamp, combineTransforms, float, lambertMaterial, length, log, mix, normalize, rgb, rgba, select, smoothstep, textureSampler2d, timeUniforms, transformed, translateX, translateZ, uniforms, varyingAttributes, varyingFloat, varyingVec3, vec2, vec4 } from "@hology/core/shader-nodes";
import { NodeShader, NodeShaderOutput, Parameter } from "@hology/core/shader/shader";
import { Color, Texture, Vector3 } from "three";

export class GrassShader extends NodeShader {
  @Parameter()
  color: Color

  @Parameter()
  color2: Color

  @Parameter()
  colorBottom: Color


  @Parameter()
  alphaMap: Texture

  output(): NodeShaderOutput {



    const distanceFromCamera = transformed.mvPosition.z().multiply(float(-1))
    const distanceAlpha = varyingFloat(smoothstep(float(100), float(60) , distanceFromCamera))
    
    const worldPosition = uniforms.instanceMatrix.multiplyVec(vec4(attributes.position, float(1)))

    const playerPos = new UniformVec3Node('playerPos', new Vector3())
    const distanceToPlayerPos = length(playerPos.subtract(worldPosition.xyz()))
    const distanceToPlayerPosVarying = varyingFloat(distanceToPlayerPos) 

    const noiseAnimatedOffset = vec2(1,1).multiplyScalar(timeUniforms.elapsed.multiply(0.5))
    const noise = new SimplexNoiseNode(worldPosition.xz().add(noiseAnimatedOffset).multiplyScalar(0.2))
    
    const colorNoiseScale = 0.07
    const colorNoise = new SimplexNoiseNode(worldPosition.xz().multiplyScalar(colorNoiseScale))

    const tipColor1 = rgb(this.color ?? 0xffffff)
    const tipColor2 = rgb(this.color2 ?? 0xffffff)
    const tipColor = mix(tipColor1, tipColor2, varyingFloat(clamp(colorNoise, float(0), float(1))))

    const offsetFactor = 0.1
    
    const gradientColor = mix(
      tipColor,
      rgb(this.colorBottom ?? new Color(0x4A8B32).convertSRGBToLinear()),
      varyingAttributes.uv.y().add(0.2)
    )

    const alpha = this.alphaMap != null 
      ? textureSampler2d(this.alphaMap).sample(varyingAttributes.uv).r()
      : float(1)

    const lambertColor = lambertMaterial({color: gradientColor}).rgb()

    const playerDir = normalize(worldPosition.xyz().subtract(playerPos))
    
    // I can translate in x an z direction, combining the transforms. 
    const grassTop = float(1).subtract(attributes.uv.y())
    const grassDistanceMixFactor = log(distanceToPlayerPos).add(1)
    const collideDistanceFactor = mix(float(1), float(0), clamp(distanceToPlayerPos.divide(2).add(.3), float(0), float(1)))
        const invCollideDistanceFactor = float(1).subtract(collideDistanceFactor)
    return {
      color: rgba(lambertColor, alpha.multiply(distanceAlpha)),

      //color: select(distanceToPlayerPos.lte(2), rgba(0xffffff), rgba(0x000000)), 
      transform: combineTransforms( 

            translateX(float(0.7).multiply(collideDistanceFactor).multiply(playerDir.x()).multiply(grassTop)),
            translateZ(float(0.7).multiply(collideDistanceFactor).multiply(playerDir.z()).multiply(grassTop)),

          translateX(float(offsetFactor).multiply(invCollideDistanceFactor).multiply(noise).multiply(grassTop)),
          
        ),
      //transform: translateX(float(offsetFactor).multiply(noise).multiply(float(1).subtract(attributes.uv.y())))
    }
  }

  override build() {
    return new NodeShaderMaterial({
      transparent: false,
      alphaTest: 0.8,
      ...this.output()
    })
  }
}

export default GrassShader
